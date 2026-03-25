import GroupMessage from "../models/GroupMessage.js";
import Group from "../models/Group.js";
import User from "../models/User.js";
import { io, userSocketMap } from "../server.js";
import admin from "../lib/firebaseAdmin.js";
import cloudinary from "../lib/cloudinary.js";

/* ================= SEND GROUP MESSAGE ================= */
export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId, text, image, audio, video, isViewOnce, replyTo } = req.body;
    const userId = req.user._id.toString();

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    const isMember = group.members.some(id => id.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied: Not a member" });
    }

    if (video && video.length > 14000000) { // ~13.3MB Base64 string for a 10MB file
       return res.status(413).json({ success: false, message: "Video maximum size is 10MB limit." });
    }

    let imageUrl = null;
    let audioUrl = null;
    let videoUrl = null;

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

    let expiresAt = undefined;
    if (videoUrl) {
       expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); 
    }

    const message = await GroupMessage.create({
      group: groupId,
      sender: req.user._id,
      text,
      image: imageUrl,
      audio: audioUrl,
      video: videoUrl,
      isViewOnce: isViewOnce || false,
      expiresAt: expiresAt,
      replyTo: replyTo || null,
    });

    const populatedMessage = await message.populate([
      { path: "sender", select: "fullName profilePic" },
      { path: "replyTo", populate: { path: "sender", select: "fullName" } }
    ]);

    // Emit to all members natively, tracking offline members
    const offlineMembers = [];
    group.members.forEach((memberId) => {
      if (memberId.toString() === userId) return; // Skip sender

      const socketId = userSocketMap[memberId.toString()];
      if (socketId) {
        io.to(socketId).emit("newMessage", populatedMessage);
      } else {
        offlineMembers.push(memberId);
      }
    });

    // Dispatch Multicast Firebase Push Notification 
    if (offlineMembers.length > 0) {
       const offlineUsers = await User.find({ _id: { $in: offlineMembers }, fcmToken: { $ne: "" } });
       const tokens = offlineUsers.map(u => u.fcmToken).filter(Boolean);

       if (tokens.length > 0) {
           try {
               await admin.messaging().sendEachForMulticast({
                   tokens,
                   notification: {
                       title: `${group.name}`,
                       body: `${req.user.fullName}: ${isViewOnce ? '📷 View Once' : (text || 'Media Message')}`
                   },
                   data: { chatId: groupId.toString(), type: "group" }
               });
           } catch(err) { 
               console.error("FCM Multicast Error:", err.message); 
           }
       }
    }

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= GET MESSAGES ================= */
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id.toString();

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    const isMember = group.members.some(id => id.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied: Not a member" });
    }

    // 🔥 HISTORY ACCESS PIPELINE
    let timeFilter = {};
    if (group.historyAccess === "from_join") {
       const userJoinedAt = group.joinDates?.get(userId);
       if (userJoinedAt) {
          timeFilter = { createdAt: { $gte: new Date(userJoinedAt) } };
       }
    }

    const messages = await GroupMessage.find({ group: groupId, ...timeFilter })
      .populate("sender", "fullName profilePic")
      .populate({ path: "replyTo", populate: { path: "sender", select: "fullName" } })
      .sort({ createdAt: 1 });

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= DELETE MESSAGE ================= */
export const deleteGroupMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { mode = "me" } = req.body;
    const userId = req.user._id.toString();

    const message = await GroupMessage.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: "Message not found" });

    const group = await Group.findById(message.group);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    const isAdmin = group.admins.some((id) => id.toString() === userId);

    // MODE: EVERYONE (Admin Only)
    if (mode === "everyone") {
      if (!isAdmin) {
        return res.status(403).json({ success: false, message: "Only admin can delete for everyone" });
      }

      await message.deleteOne(); 

      // Notify all members to remove the bubble
      group.members.forEach((memberId) => {
        const socketId = userSocketMap[memberId.toString()];
        if (socketId) {
          io.to(socketId).emit("groupMessageDeleted", { messageId, chatId: group._id });
        }
      });

      return res.json({ success: true, message: "Deleted for everyone" });
    }

    // MODE: ME
    await GroupMessage.findByIdAndUpdate(messageId, {
      $addToSet: { deletedFor: userId }
    });

    res.json({ success: true, message: "Deleted for me" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};