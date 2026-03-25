import mongoose from "mongoose";

const groupMessageSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      default: "",
    },
    audio: { type: String, default: "" },
    video: { type: String, default: "" },
    isViewOnce: { type: Boolean, default: false },
    expiresAt: { type: Date, index: { expires: 0 } },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupMessage",
      default: null,
    },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    deletedForEveryone: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("GroupMessage", groupMessageSchema);