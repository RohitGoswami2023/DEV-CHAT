import Message from "../models/Message.js";
import User from "../models/User.js";
import ChatRequest from "../models/ChatRequest.js"; // 🔥 1. IMPORT THIS
import GroupMessage from "../models/GroupMessage.js";
import Group from "../models/Group.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../lib/socket.js";
import admin from "../lib/firebaseAdmin.js";
import crypto from "crypto";
import dotenv from "dotenv";
import { cacheGet, cacheSet, cacheDel } from "../lib/redis.js";

dotenv.config();

const SECRET_KEY = process.env.MESSAGE_SECRET_KEY;
const ALGORITHM = "aes-256-cbc";

/* ================= ENCRYPT / DECRYPT HELPERS ================= */
const encryptText = (text) => {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
};

const decryptText = (encryptedText) => {
  if (!encryptedText) return null;
  const [ivHex, encrypted] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

/* ================= GET MY CHATS (UPDATED) ================= */
export const getMyChats = async (req, res) => {
  try {
    const myId = req.user._id.toString();

    // 1. Get users from Messages
    const messages = await Message.find({
      $or: [{ senderId: myId }, { receiverId: myId }],
    }).select("senderId receiverId seen status deletedFor");

    const userMap = new Map();
    const unseen = {};

    // Process Messages
    for (const msg of messages) {
      if (msg.deletedFor?.includes(myId)) continue;

      const otherUserId =
        msg.senderId.toString() === myId
          ? msg.receiverId.toString()
          : msg.senderId.toString();

      userMap.set(otherUserId, true);

      // Count unseen messages
      if (msg.receiverId.toString() === myId && msg.status !== "read") {
        unseen[otherUserId] = (unseen[otherUserId] || 0) + 1;
      }
    }

    // 🔥 2. Get users from Accepted Chat Requests (Friends with no messages yet)
    // This fixes the "Nothing happens" issue when you add someone but haven't spoken.
    const connections = await ChatRequest.find({
      $or: [
        { sender: myId, status: "accepted" },
        { receiver: myId, status: "accepted" }
      ]
    });

    for (const conn of connections) {
      const otherId = conn.sender.toString() === myId ? conn.receiver.toString() : conn.sender.toString();
      // Add to map (if not already there from messages)
      if (!userMap.has(otherId)) {
        userMap.set(otherId, true);
      }
    }

    // 🔥 2.5 Ensure users hidden by the active user are explicitly ignored.
    const hiddenSet = new Set(req.user.hiddenChats || []);
    const finalUserIds = Array.from(userMap.keys()).filter(id => !hiddenSet.has(id));

    // 3. Fetch User Details
    const users = await User.find({
      _id: { $in: finalUserIds },
    }).select("_id fullName profilePic bio blockedUsers");

    res.json({ success: true, users, unseen });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= GET MESSAGES (MARK AS READ) ================= */
export const getMessage = async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const otherId = req.params.id;

    // 🔥 1. Mark incoming messages as READ
    await Message.updateMany(
      { senderId: otherId, receiverId: myId, status: { $ne: "read" } },
      { $set: { status: "read", seen: true } }
    );

    // 🔥 2. Notify the Sender that I read their messages
    const senderSocketId = userSocketMap[otherId];
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesRead", { by: myId });
    }

    // ⚡ Redis Cache Check
    const cacheKey = `devchat:msgs:${[myId, otherId].sort().join(":")}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json({ success: true, messages: cached, cached: true });
    }

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId },
      ],
    })
      .populate({
        path: "replyToGroupMsg",
        populate: { path: "sender", select: "fullName" }
      })
      .populate({
        path: "replyTo",
        populate: { path: "senderId", select: "fullName" }
      })
      .sort({ createdAt: 1 });

    const decrypted = messages
      .map((m) => {
        if (m.deletedForEveryone) {
          return { ...m._doc, text: null, image: null, deleted: true };
        }
        if (m.deletedFor?.includes(myId)) return null;

        return {
          ...m._doc,
          text: m.text ? decryptText(m.text) : null,
          replyTo: m.replyTo ? {
            ...m.replyTo._doc,
            text: m.replyTo.text ? decryptText(m.replyTo.text) : null
          } : null
        };
      })
      .filter(Boolean);

    // ⚡ Cache in Redis for fast re-access (90 seconds)
    await cacheSet(cacheKey, decrypted, 90);

    res.json({ success: true, messages: decrypted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= SEND MESSAGE (MARK DELIVERED/SENT) ================= */
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.id;
    const { text, image, audio, video, document, documentName, location, isViewOnce, replyToGroupMsgId, replyTo } = req.body;

    // --- BLOCK CHECK ---
    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ message: "User not found" });

    if (receiver.blockedUsers.includes(senderId)) {
      return res.status(403).json({ message: "You are blocked by this user" });
    }

    const sender = await User.findById(senderId);
    if (sender.blockedUsers.includes(receiverId)) {
      return res.status(403).json({ message: "You blocked this user. Unblock to send." });
    }
    // -------------------

    // --- PAYLOAD SIZE CHECKS ---
    if (video && video.length > 14000000) {
      return res.status(413).json({ success: false, message: "Video maximum size is 10MB limit." });
    }
    if (document && document.length > 14000000) {
      return res.status(413).json({ success: false, message: "Document size exceeds 10MB limit." });
    }

    let imageUrl = null;
    let audioUrl = null;
    let videoUrl = null;
    let documentUrl = null;

    if (image) {
      const upload = await cloudinary.uploader.upload(image, { resource_type: "auto" });
      imageUrl = upload.secure_url;
    }
    if (audio) {
      const upload = await cloudinary.uploader.upload(audio, { resource_type: "auto" });
      audioUrl = upload.secure_url;
    }
    if (video) {
      const upload = await cloudinary.uploader.upload(video, { resource_type: "auto" });
      videoUrl = upload.secure_url;
    }
    if (document) {
      const upload = await cloudinary.uploader.upload(document, { resource_type: "auto" });
      documentUrl = upload.secure_url;
    }

    const encryptedText = text ? encryptText(text) : null;

    // 🔥 Check if receiver is online to determine initial status
    const isReceiverOnline = userSocketMap[receiverId];
    const initialStatus = isReceiverOnline ? "delivered" : "sent";

    // 24 Hour Expiration logic natively
    let expiresAt = undefined;
    if (videoUrl) {
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // exactly 24 hours
    }

    // Unhide the chat automatically for both parties upon message exchange
    await User.updateMany(
      { _id: { $in: [senderId, receiverId] } },
      { $pull: { hiddenChats: { $in: [senderId.toString(), receiverId.toString()] } } }
    );

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text: encryptedText,
      image: imageUrl,
      audio: audioUrl,
      video: videoUrl,
      document: documentUrl || null,
      documentName: documentName || null,
      location: location || null,
      isViewOnce: isViewOnce || false,
      expiresAt: expiresAt,
      replyToGroupMsg: replyToGroupMsgId || null,
      replyTo: replyTo || null,
      status: initialStatus, // ✅ Set Sent or Delivered
    });

    const populated = await newMessage.populate([
      {
        path: "replyToGroupMsg",
        populate: { path: "sender", select: "fullName" }
      },
      {
        path: "replyTo",
        select: "text image senderId",
        populate: { path: "senderId", select: "fullName" }
      }
    ]);

    const decryptedMessage = {
      ...populated._doc,
      text: text,
      replyTo: populated.replyTo ? {
        ...populated.replyTo._doc,
        text: populated.replyTo.text ? decryptText(populated.replyTo.text) : null
      } : null
    };

    const socketId = userSocketMap[receiverId];
    if (socketId) {
      io.to(socketId).emit("newMessage", decryptedMessage);
    } else {
      // Offline Notification
      if (receiver.fcmToken) {
        try {
          await admin.messaging().send({
            token: receiver.fcmToken,
            notification: {
              title: `${sender.fullName}`,
              body: isViewOnce ? '📷 View Once Message' : (text ? text : (image ? '📷 Photo' : (video ? '🎥 Video' : (audio ? '🎤 Voice Message' : 'New Message'))))
            },
            data: { chatId: senderId.toString(), type: "private" },
            android: { priority: "high" },
          });
        } catch (err) {
          console.error("FCM Send Error:", err.message);
        }
      }
    }

    // ⚡ Invalidate message cache
    await cacheDel(`devchat:msgs:${[senderId.toString(), receiverId.toString()].sort().join(":")}`);

    res.json({ success: true, message: decryptedMessage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= DELETE PRIVATE MESSAGE ================= */
export const deletePrivateMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { mode = "me" } = req.body;
    const userId = req.user._id.toString();

    const message = await Message.findById(messageId);
    if (!message)
      return res.status(404).json({ success: false, message: "Message not found" });

    const senderId = message.senderId.toString();
    const receiverId = message.receiverId.toString();

    if (senderId !== userId && receiverId !== userId) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    if (mode === "everyone") {
      if (senderId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Only sender can delete for everyone",
        });
      }

      message.deletedForEveryone = true;
      await message.save();

      const senderSocketId = userSocketMap[senderId];
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageDeleted", { messageId, chatId: receiverId });
      }

      const receiverSocketId = userSocketMap[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", { messageId, chatId: senderId });
      }

      await cacheDel(`devchat:msgs:${[senderId, receiverId].sort().join(":")}`);
      return res.json({ success: true });
    }

    await Message.updateOne(
      { _id: messageId },
      { $addToSet: { deletedFor: userId } }
    );

    await cacheDel(`devchat:msgs:${[senderId, receiverId].sort().join(":")}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= DELETE PRIVATE CHAT ================= */
export const deletePrivateChat = async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const otherId = req.params.userId;

    await Message.updateMany(
      {
        $or: [
          { senderId: myId, receiverId: otherId },
          { senderId: otherId, receiverId: myId },
        ],
      },
      { $addToSet: { deletedFor: myId } }
    );

    await cacheDel(`devchat:msgs:${[myId, otherId].sort().join(":")}`);

    await User.findByIdAndUpdate(myId, {
      $addToSet: { hiddenChats: otherId.toString() }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= CONSUME VIEW ONCE RECORD ================= */
export const consumeViewOnce = async (req, res) => {
  try {
    const { messageId } = req.params;

    let message = await Message.findById(messageId);
    let isGroup = false;

    if (!message) {
      message = await GroupMessage.findById(messageId);
      isGroup = true;
    }

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    if (!message.isViewOnce) {
      return res.status(400).json({ success: false, message: "Not a view-once message" });
    }

    // Permanently wipe the media payloads
    message.image = null;
    message.video = null;

    await message.save();

    // Broadcast the exact timestamp/destruction state
    if (isGroup) {
      const group = await Group.findById(message.group);
      if (group) {
        group.members.forEach((memberId) => {
          const socketId = userSocketMap[memberId.toString()];
          if (socketId) {
            io.to(socketId).emit("viewOnceConsumed", { messageId, chatId: group._id, isGroup: true });
          }
        });
      }
    } else {
      const senderSocket = userSocketMap[message.senderId.toString()];
      const receiverSocket = userSocketMap[message.receiverId.toString()];

      if (senderSocket) io.to(senderSocket).emit("viewOnceConsumed", { messageId, chatId: message.receiverId.toString(), isGroup: false });
      if (receiverSocket) io.to(receiverSocket).emit("viewOnceConsumed", { messageId, chatId: message.senderId.toString(), isGroup: false });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};