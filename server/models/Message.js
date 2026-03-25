import mongoose from "mongoose";
const messageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", require: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", require: true },
    text: { type: String },
    image: { type: String },
    audio: { type: String },
    video: { type: String },
    isViewOnce: { type: Boolean, default: false },
    expiresAt: { type: Date, index: { expires: 0 } },
    seen: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    deletedForEveryone: { type: Boolean, default: false },
    replyToGroupMsg: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GroupMessage",
        default: null,
    },
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null,
    },
}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);
export default Message;