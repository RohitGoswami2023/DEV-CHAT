import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    chatId: { type: String, required: true }, // Can be the User ID or Group ID natively
    isGroup: { type: Boolean, default: false },
    scheduledAt: { type: Date, required: true }, // The ultimate timestamp of execution
    notified15Min: { type: Boolean, default: false }, // Explicit boolean preventing duplicate Push loops
    executed: { type: Boolean, default: false }, // Explicit boolean preventing duplicate dispatches
    sendEmail: { type: Boolean, default: false }, // Explicit toggle to send email notification
  },
  { timestamps: true }
);

// High-speed indices for background Chron sorting
reminderSchema.index({ scheduledAt: 1, executed: 1, notified15Min: 1 });

export default mongoose.model("Reminder", reminderSchema);
