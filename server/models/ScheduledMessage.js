import mongoose from "mongoose";

const scheduledMessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // private only
  text: { type: String, required: true },
  scheduledAt: { type: Date, required: true },
  sent: { type: Boolean, default: false },
  cancelledAt: { type: Date, default: null },
}, { timestamps: true });

const ScheduledMessage = mongoose.model("ScheduledMessage", scheduledMessageSchema);
export default ScheduledMessage;
