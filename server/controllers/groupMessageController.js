import GroupMessage from "../models/GroupMessage.js";
import Group from "../models/Group.js";
import { io, userSocketMap } from "../server.js";

/* ================= SEND GROUP MESSAGE ================= */
export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId, text, image, replyTo } = req.body;
    const userId = req.user._id.toString();

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    const isMember = group.members.some(id => id.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied: Not a member" });
    }

    const message = await GroupMessage.create({
      group: groupId,
      sender: req.user._id,
      text,
      image,
      replyTo: replyTo || null,
    });

    const populatedMessage = await message.populate([
      { path: "sender", select: "fullName profilePic" },
      { path: "replyTo", populate: { path: "sender", select: "fullName" } }
    ]);

    // Emit to all members
    group.members.forEach((memberId) => {
      const socketId = userSocketMap[memberId.toString()];
      if (socketId) {
        io.to(socketId).emit("newMessage", populatedMessage);
      }
    });

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

    const messages = await GroupMessage.find({ group: groupId })
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