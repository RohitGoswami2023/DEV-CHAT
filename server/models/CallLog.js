import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema({
  caller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  duration: { type: Number, default: 0 }, // in seconds
  status: { 
    type: String, 
    enum: ["completed", "missed", "rejected", "ongoing"], 
    default: "ongoing" 
  },
  callType: { type: String, default: "voice" }
}, { timestamps: true });

const CallLog = mongoose.model("CallLog", callLogSchema);
export default CallLog;
