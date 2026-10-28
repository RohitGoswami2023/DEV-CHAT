import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Message from "../models/Message.js";
import User from "../models/User.js";
import admin from "./firebaseAdmin.js";
import { createCallLogEntry } from "../controllers/callController.js";
import { pubClient, subClient, addOnlineUser, removeOnlineUser, getOnlineUserIds } from "./redis.js";

export let io;
export const userSocketMap = {}; // userId -> socketId
const callStartTimeMap = {}; // socketId -> { startTime, from, to }

// ✅ Tracks BOTH participants by userId to prevent race conditions
const activeCallUsers = new Set(); // Set<userId>

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        process.env.CLIENT_URL,
        "http://localhost:5173",
        "https://dev-chat-tan.vercel.app",
      ].filter(Boolean),
      credentials: true,
    },
  });

  // Attach Redis Adapter for multi-instance scaling if pub/sub clients are available
  if (pubClient && subClient) {
    try {
      io.adapter(createAdapter(pubClient, subClient));
      console.log("⚡ Socket.io Redis Adapter enabled");
    } catch (err) {
      console.warn("⚠️ Failed to attach Socket.io Redis adapter:", err.message);
    }
  }

  io.on("connection", async (socket) => {
    const userId = socket.handshake.query?.userId;
    if (!userId) return;

    userSocketMap[userId] = socket.id;
    await addOnlineUser(userId, socket.id);
    const onlineUsers = await getOnlineUserIds(userSocketMap);
    io.emit("getOnlineUsers", onlineUsers);

    // VOICE CALL SIGNALING
    socket.on("callUser", async ({ to, signalData, from, callerName, callerPic }) => {
      const targetSocket = userSocketMap[to];

      // ✅ 1. Check if RECIPIENT is already in any call (by userId, covers both caller & receiver roles)
      if (activeCallUsers.has(to)) {
        socket.emit("callBusy", { name: callerName });
        // 🔔 Push notification: tell the receiver someone tried to call
        try {
          const busyReceiver = await User.findById(to).select("fcmToken");
          if (busyReceiver?.fcmToken) {
            admin.messaging().send({
              token: busyReceiver.fcmToken,
              notification: { title: "📵 Missed Call", body: `${callerName} tried to call you while you were busy` },
              data: { type: "missedCall", from },
              android: { priority: "high" },
            }).catch(e => console.warn("Busy FCM error:", e.message));
          }
        } catch (e) { console.warn("Busy notify error:", e.message); }
        return;
      }

      // ✅ 2. Check if CALLER is already in any call
      if (activeCallUsers.has(from)) {
        return;
      }

      // ✅ Mark BOTH participants as busy immediately
      activeCallUsers.add(from);
      activeCallUsers.add(to);

      callStartTimeMap[socket.id] = { startTime: new Date(), from, to, status: "ongoing", isAnswered: false };

      // 🔥 Send Push Notification for Background/Force-Delivery
      try {
        const receiver = await User.findById(to).select("fcmToken");
        if (receiver?.fcmToken) {
           admin.messaging().send({
            token: receiver.fcmToken,
            // ✅ Data-only payload to ensure Service Worker's onBackgroundMessage is triggered on Android
            data: { 
                type: "call", 
                from, 
                callerName: callerName || "Someone",
                signal: JSON.stringify(signalData),
                title: "📞 Incoming Call", // SW will use these
                body: `${callerName} is calling you...`
            },
            android: { 
                priority: "high",
                ttl: 3600 * 1000 // 1 hour
            },
            apns: { payload: { aps: { contentAvailable: true, sound: "default" } } },
          }).catch(e => console.error("Call FCM Error:", e.message));
        }
      } catch (err) { console.error("Call Notification Fetch Error:", err); }

      if (targetSocket) {
        io.to(targetSocket).emit("callIncoming", { signal: signalData, from, callerName, callerPic });
      } else {
        createCallLogEntry({ caller: from, receiver: to, startTime: new Date(), status: "missed" });
        new Message({
          senderId: from,
          receiverId: to,
          messageType: "call_log",
          callLog: { status: "missed", callType: "voice" }
        }).save().then(m => socket.emit("newMessage", m));
      }
    });

    socket.on("answerCall", ({ to, signal }) => {
      const targetSocket = userSocketMap[to];
      if (targetSocket) {
        // ✅ Mark call as answered
        const callInfo = callStartTimeMap[targetSocket] || callStartTimeMap[socket.id];
        if (callInfo) {
            callInfo.isAnswered = true;
            callInfo.startTime = new Date(); // Start actual duration from answer
        }
        io.to(targetSocket).emit("callAnswered", signal);
      }
    });

    socket.on("endCall", ({ to }) => {
      const targetSocket = userSocketMap[to];
      const callInfo = callStartTimeMap[socket.id] || callStartTimeMap[targetSocket];
      if (callInfo && callInfo.status === "ongoing") {
        const endTime = new Date();
        const isAnswered = callInfo.isAnswered;
        const duration = isAnswered ? Math.floor((endTime - callInfo.startTime) / 1000) : 0;
        const status = isAnswered ? "completed" : "missed";
        
        createCallLogEntry({ 
          caller: callInfo.from, 
          receiver: callInfo.to, 
          startTime: callInfo.startTime, 
          endTime, 
          duration, 
          status 
        });
        new Message({
          senderId: callInfo.from,
          receiverId: callInfo.to,
          messageType: "call_log",
          callLog: { duration, status, callType: "voice" }
        }).save().then(m => {
          io.to(userSocketMap[callInfo.from]).emit("newMessage", m);
          io.to(userSocketMap[callInfo.to]).emit("newMessage", m);
        });
        // ✅ Free both participants
        activeCallUsers.delete(callInfo.from);
        activeCallUsers.delete(callInfo.to);
        delete callStartTimeMap[socket.id];
        delete callStartTimeMap[targetSocket];
      }
      if (targetSocket) io.to(targetSocket).emit("callEnded");
    });

    socket.on("callRejected", ({ to }) => {
      const targetSocket = userSocketMap[to];
      const callInfo = callStartTimeMap[targetSocket];
      if (callInfo) {
        createCallLogEntry({ 
          caller: callInfo.from, 
          receiver: callInfo.to, 
          startTime: callInfo.startTime, 
          status: "rejected" 
        });
        new Message({
          senderId: callInfo.from,
          receiverId: callInfo.to,
          messageType: "call_log",
          callLog: { status: "rejected", callType: "voice" }
        }).save().then(m => {
          io.to(userSocketMap[callInfo.from]).emit("newMessage", m);
          io.to(userSocketMap[callInfo.to]).emit("newMessage", m);
        });
        // ✅ Free both participants on rejection
        activeCallUsers.delete(callInfo.from);
        activeCallUsers.delete(callInfo.to);
        delete callStartTimeMap[targetSocket];
      }
      if (targetSocket) io.to(targetSocket).emit("callRejected");
    });

    socket.on("disconnect", async () => {
      const callInfo = callStartTimeMap[socket.id];
      if (callInfo) {
        const targetId = callInfo.to === userId ? callInfo.from : callInfo.to;
        const targetSocket = userSocketMap[targetId];
        if (targetSocket) io.to(targetSocket).emit("callEnded");
        const duration = Math.floor((new Date() - callInfo.startTime) / 1000);
        createCallLogEntry({ ...callInfo, endTime: new Date(), duration, status: "completed" });
        // ✅ Free both participants on disconnect
        activeCallUsers.delete(callInfo.from);
        activeCallUsers.delete(callInfo.to);
        delete callStartTimeMap[socket.id];
        if (targetSocket) delete callStartTimeMap[targetSocket];
      }
      delete userSocketMap[userId];
      await removeOnlineUser(userId, socket.id);
      const onlineUsers = await getOnlineUserIds(userSocketMap);
      io.emit("getOnlineUsers", onlineUsers);
    });
  });

  return io;
};
