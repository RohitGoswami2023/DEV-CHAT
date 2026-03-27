import { Server } from "socket.io";
import Message from "../models/Message.js";
import User from "../models/User.js";
import admin from "./firebaseAdmin.js";
import { createCallLogEntry } from "../controllers/callController.js";

export let io;
export const userSocketMap = {}; // userId -> socketId
const callStartTimeMap = {}; // socketId -> { startTime, from, to }

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

  io.on("connection", (socket) => {
    const userId = socket.handshake.query?.userId;
    if (!userId) return;

    userSocketMap[userId] = socket.id;
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // VOICE CALL SIGNALING
    socket.on("callUser", async ({ to, signalData, from, callerName, callerPic }) => {
      const targetSocket = userSocketMap[to];
      
      // ✅ 1. Check if recipient is already in another call
      if (targetSocket && callStartTimeMap[targetSocket]) {
        return socket.emit("callBusy", { name: callerName }); // In a real app, use recipient name if known
      }
      // ✅ 2. Check if caller is already in another call (prevents double initiation)
      if (callStartTimeMap[socket.id]) {
        return; 
      }

      callStartTimeMap[socket.id] = { startTime: new Date(), from, to, status: "ongoing" };

      // 🔥 Send Push Notification for Background/Force-Delivery
      try {
        const receiver = await User.findById(to).select("fcmToken");
        if (receiver?.fcmToken) {
           admin.messaging().send({
            token: receiver.fcmToken,
            notification: {
              title: "📞 Incoming Call",
              body: `${callerName} is calling you...`,
            },
            data: { 
                type: "call", 
                from, 
                callerName: callerName || "Someone",
                signal: JSON.stringify(signalData)
            },
            android: { 
                priority: "high",
                notification: {
                    sound: "default",
                    clickAction: "FLUTTER_NOTIFICATION_CLICK" // Common for many platforms to trigger click handlers
                }
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
        if (callStartTimeMap[targetSocket]) callStartTimeMap[targetSocket].startTime = new Date();
        io.to(targetSocket).emit("callAnswered", signal);
      }
    });

    socket.on("endCall", ({ to }) => {
      const targetSocket = userSocketMap[to];
      const callInfo = callStartTimeMap[socket.id] || callStartTimeMap[targetSocket];
      if (callInfo && callInfo.status === "ongoing") {
        const endTime = new Date();
        const duration = Math.floor((endTime - callInfo.startTime) / 1000);
        createCallLogEntry({ 
          caller: callInfo.from, 
          receiver: callInfo.to, 
          startTime: callInfo.startTime, 
          endTime, 
          duration, 
          status: "completed" 
        });
        new Message({
          senderId: callInfo.from,
          receiverId: callInfo.to,
          messageType: "call_log",
          callLog: { duration, status: "completed", callType: "voice" }
        }).save().then(m => {
          io.to(userSocketMap[callInfo.from]).emit("newMessage", m);
          io.to(userSocketMap[callInfo.to]).emit("newMessage", m);
        });
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
        delete callStartTimeMap[targetSocket];
      }
      if (targetSocket) io.to(targetSocket).emit("callRejected");
    });

    socket.on("disconnect", () => {
      const callInfo = callStartTimeMap[socket.id];
      if (callInfo) {
        const targetId = callInfo.to === userId ? callInfo.from : callInfo.to;
        const targetSocket = userSocketMap[targetId];
        if (targetSocket) io.to(targetSocket).emit("callEnded");
        const duration = Math.floor((new Date() - callInfo.startTime) / 1000);
        createCallLogEntry({ ...callInfo, endTime: new Date(), duration, status: "completed" });
        delete callStartTimeMap[socket.id];
        if (targetSocket) delete callStartTimeMap[targetSocket];
      }
      delete userSocketMap[userId];
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
  });

  return io;
};
