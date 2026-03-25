import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    rules: { type: String },
    
    // Explicit History Security Settings defined natively by Admin
    historyAccess: {
      type: String,
      enum: ["from_join", "all"],
      default: "all"
    },
    
    // Explicit mappings anchoring user identifiers statically against creation timestamps independently
    joinDates: {
      type: Map,
      of: Date,
      default: {}
    },
    name: { type: String, required: true },

    groupId: {
      type: String,
      unique: true,
      index: true,
    },

    password: { type: String, required: true },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    description: String,
    groupIcon: String,

    joinRequests: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        requestedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Group", groupSchema);