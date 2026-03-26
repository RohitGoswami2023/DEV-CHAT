// controllers/ChatRequestController.js

import ChatRequest from "../models/ChatRequest.js";
import User from "../models/User.js";
import Message from "../models/Message.js"; // <--- 1. IMPORT MESSAGE MODEL
import { io, userSocketMap } from "../lib/socket.js"; 

// ---------------- SEND REQUEST ----------------
export const sendChatRequest = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId } = req.body;

    if (senderId.toString() === receiverId) {
      return res.status(400).json({ message: "Cannot send request to yourself" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver)
      return res.status(404).json({ message: "User not found" });

    if (!receiver.allowChatRequests)
      return res.status(403).json({ message: "User has disabled requests" });

    if (receiver.blockedUsers.includes(senderId))
      return res.status(403).json({ message: "You are blocked by this user" });

    const existingRequest = await ChatRequest.findOne({
      sender: senderId,
      receiver: receiverId,
    });

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return res.status(400).json({ message: "Request already pending" });
      }

      if (existingRequest.status === "accepted") {
        // --- 2. UNHIDE CHAT FOR SENDER ---
        await Message.updateMany(
            { 
                $or: [
                    { senderId: senderId, receiverId: receiverId },
                    { senderId: receiverId, receiverId: senderId }
                ]
            },
            { $pull: { deletedFor: senderId } } // Remove sender from deleted list
        );

        // Notify Receiver (Socket)
        const receiverSocketId = userSocketMap[receiverId];
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("requestAccepted");
        }
        
        return res.json({ success: true, message: "You are already connected" });
      }

      if (existingRequest.status === "rejected") {
        existingRequest.status = "pending";
        await existingRequest.save();
        
        const receiverSocketId = userSocketMap[receiverId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newChatRequest", existingRequest);
        }

        return res.json({ success: true, request: existingRequest, message: "Request resent" });
      }
    }

    const request = await ChatRequest.create({
      sender: senderId,
      receiver: receiverId,
    });

    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
        io.to(receiverSocketId).emit("newChatRequest", request);
    }

    res.json({ success: true, request });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Request already sent" });
    }
    res.status(500).json({ message: error.message });
  }
};

// ---------------- ACCEPT REQUEST ----------------
export const acceptChatRequest = async (req, res) => {
  const { requestId } = req.body;

  const request = await ChatRequest.findById(requestId);
  if (!request)
    return res.status(404).json({ message: "Request not found" });

  if (request.receiver.toString() !== req.user._id.toString())
    return res.status(403).json({ message: "Unauthorized" });

  request.status = "accepted";
  await request.save();

  // --- 3. UNHIDE CHAT FOR RECEIVER (Just in case) ---
  const myId = req.user._id;
  const senderId = request.sender;
  
  await Message.updateMany(
    { 
        $or: [
            { senderId: senderId, receiverId: myId },
            { senderId: myId, receiverId: senderId }
        ]
    },
    { $pull: { deletedFor: myId } } 
  );

  const senderSocketId = userSocketMap[senderId.toString()];
  if (senderSocketId) {
    io.to(senderSocketId).emit("requestAccepted");
  }

  res.json({ success: true, message: "Request accepted" });
};

// ---------------- REJECT REQUEST ----------------
export const rejectChatRequest = async (req, res) => {
  const { requestId } = req.body;

  const request = await ChatRequest.findById(requestId);
  if (!request)
    return res.status(404).json({ message: "Request not found" });

  if (request.receiver.toString() !== req.user._id.toString())
    return res.status(403).json({ message: "Unauthorized" });

  request.status = "rejected";
  await request.save();

  res.json({ success: true, message: "Request rejected" });
};

// ---------------- DELETE REQUEST ----------------
export const deleteChatRequest = async (req, res) => {
  const { requestId } = req.params;

  const request = await ChatRequest.findById(requestId);
  if (!request)
    return res.status(404).json({ message: "Request not found" });

  if (
    request.sender.toString() !== req.user._id.toString() &&
    request.receiver.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  await request.deleteOne();
  res.json({ success: true, message: "Request deleted" });
};

export const getMyRequests = async (req, res) => {
  const requests = await ChatRequest.find({
    receiver: req.user._id,
    status: "pending",
  }).populate("sender", "fullName profilePic publicUserId");

  res.json({ success: true, requests });
};

// ---------------- GET OUTGOING REQUESTS ----------------
export const getOutgoingRequests = async (req, res) => {
  const requests = await ChatRequest.find({
    sender: req.user._id,
    status: "pending",
  }).populate("receiver", "fullName profilePic publicUserId");

  res.json({ success: true, requests });
};