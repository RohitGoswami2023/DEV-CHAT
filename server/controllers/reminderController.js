import Reminder from "../models/Reminder.js";
import Group from "../models/Group.js";
import { io, userSocketMap } from "../server.js";

/* ===== CREATE REMINDER / SCHEDULED MESSAGE ===== */
export const createReminder = async (req, res) => {
  try {
    const { text, chatId, isGroup, scheduledAt } = req.body;
    const creatorId = req.user._id;

    if (!text || !chatId || !scheduledAt) {
      return res.status(400).json({ success: false, message: "text, chatId, and scheduledAt are required" });
    }

    const fireAt = new Date(scheduledAt);
    if (isNaN(fireAt.getTime()) || fireAt <= new Date()) {
      return res.status(400).json({ success: false, message: "scheduledAt must be a valid future date" });
    }

    const reminder = await Reminder.create({ text, creatorId, chatId, isGroup: !!isGroup, scheduledAt: fireAt });

    // Notify connected participants immediately so the UI refreshes
    if (isGroup) {
      const group = await Group.findById(chatId);
      if (group) {
        group.members.forEach((memberId) => {
          const sId = userSocketMap[memberId.toString()];
          if (sId) io.to(sId).emit("newReminder", reminder);
        });
      }
    } else {
      // Private chat — notify both the creator and the other user
      [creatorId.toString(), chatId].forEach((uid) => {
        const sId = userSocketMap[uid];
        if (sId) io.to(sId).emit("newReminder", reminder);
      });
    }

    res.status(201).json({ success: true, reminder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ===== DELETE / CANCEL REMINDER ===== */
export const deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();

    const reminder = await Reminder.findById(id);
    if (!reminder) return res.status(404).json({ success: false, message: "Reminder not found" });
    if (reminder.executed) return res.status(400).json({ success: false, message: "Already executed, cannot cancel" });

    // Permission check
    const isCreator = reminder.creatorId.toString() === userId;
    let isAdmin = false;

    if (reminder.isGroup) {
      const group = await Group.findById(reminder.chatId);
      if (group) isAdmin = group.admins.map((a) => a.toString()).includes(userId);
    } else {
      // Private: both participants can cancel
      isAdmin = reminder.chatId === userId;
    }

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized to cancel this reminder" });
    }

    await reminder.deleteOne();

    // Notify UI
    if (reminder.isGroup) {
      const group = await Group.findById(reminder.chatId);
      if (group) {
        group.members.forEach((memberId) => {
          const sId = userSocketMap[memberId.toString()];
          if (sId) io.to(sId).emit("reminderDeleted", { reminderId: id });
        });
      }
    } else {
      [reminder.creatorId.toString(), reminder.chatId].forEach((uid) => {
        const sId = userSocketMap[uid];
        if (sId) io.to(sId).emit("reminderDeleted", { reminderId: id });
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ===== GET REMINDERS FOR A CHAT ===== */
export const getReminders = async (req, res) => {
  try {
    const { chatId } = req.params;
    const reminders = await Reminder.find({ chatId, executed: false })
      .populate("creatorId", "fullName profilePic")
      .sort({ scheduledAt: 1 });
    res.json({ success: true, reminders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ===== GET ALL UPCOMING REMINDERS FOR THE SIDEBAR BELL ===== */
export const getMyReminders = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    // Pull reminders where the user is creator OR in a private chat where chatId === userId
    const reminders = await Reminder.find({
      executed: false,
      $or: [
        { creatorId: userId },
        { chatId: userId, isGroup: false },
      ],
    })
      .populate("creatorId", "fullName profilePic")
      .sort({ scheduledAt: 1 });

    res.json({ success: true, reminders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
