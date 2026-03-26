import ScheduledMessage from "../models/ScheduledMessage.js";

// POST /api/scheduled
export const createScheduled = async (req, res) => {
  try {
    const { receiverId, text, scheduledAt } = req.body;
    if (!receiverId || !text || !scheduledAt)
      return res.status(400).json({ success: false, message: "receiverId, text, and scheduledAt are required" });

    const scheduled = await ScheduledMessage.create({
      senderId: req.user._id,
      receiverId,
      text,
      scheduledAt: new Date(scheduledAt),
    });

    res.json({ success: true, scheduled });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/scheduled/my
export const getMyScheduled = async (req, res) => {
  try {
    const scheduled = await ScheduledMessage.find({
      senderId: req.user._id,
      sent: false,
      cancelledAt: null,
    }).populate("receiverId", "fullName profilePic").sort({ scheduledAt: 1 });

    res.json({ success: true, scheduled });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/scheduled/:id
export const cancelScheduled = async (req, res) => {
  try {
    const msg = await ScheduledMessage.findOne({ _id: req.params.id, senderId: req.user._id });
    if (!msg || msg.sent) return res.status(404).json({ success: false, message: "Not found or already sent" });
    msg.cancelledAt = new Date();
    await msg.save();
    res.json({ success: true, message: "Scheduled message cancelled" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
