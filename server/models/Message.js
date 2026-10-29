import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    clientId: { type: String },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    roomId: { type: String },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: { type: String },
    image: { type: String },
    audio: { type: String },
    video: { type: String },
    document: { type: String },
    documentName: { type: String },
    location: { lat: { type: Number }, lng: { type: Number } },
    messageType: { 
        type: String, 
        enum: ["text", "image", "audio", "video", "document", "location", "call_log", "system"], 
        default: "text" 
    },
    callLog: {
        duration: { type: Number },
        status: { type: String }, // "completed", "missed", "rejected"
        callType: { type: String, default: "voice" }
    },
    isViewOnce: { type: Boolean, default: false },
    expiresAt: { type: Date, index: { expires: 0 } },
    seen: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ["pending", "sent", "delivered", "read", "failed"],
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

messageSchema.index({ roomId: 1, createdAt: -1 });

// Unique per sender+clientId, only for documents that have a clientId.
// The partial filter stops old messages (no clientId) from colliding on null.
messageSchema.index(
  { sender: 1, clientId: 1 },
  { unique: true, partialFilterExpression: { clientId: { $exists: true } } }
);

const Message = mongoose.model("Message", messageSchema);
export default Message;
