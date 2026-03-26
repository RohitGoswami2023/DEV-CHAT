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
export const deleteCallLog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const log = await CallLog.findById(id);
    if (!log) return res.status(404).json({ success: false, message: "Log not found" });

    // Security: Only participants can delete
    if (log.caller.toString() !== userId.toString() && log.receiver.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await CallLog.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Call log deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
