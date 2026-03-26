import CallLog from "../models/CallLog.js";

export const getCallLogsByUserId = async (req, res) => {
  try {
    const userId = req.user._id;
    const logs = await CallLog.find({
      $or: [{ caller: userId }, { receiver: userId }]
    })
      .populate("caller", "fullName profilePic")
      .populate("receiver", "fullName profilePic")
      .sort({ createdAt: -1 })
      .limit(50); // Get recent 50 calls
      
    res.status(200).json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createCallLogEntry = async (data) => {
  try {
    const { caller, receiver, startTime, status, duration, endTime } = data;
    const log = new CallLog({ caller, receiver, startTime, status, duration, endTime });
    await log.save();
    return log;
  } catch (err) {
    console.error("Error creating call log:", err.message);
  }
};
