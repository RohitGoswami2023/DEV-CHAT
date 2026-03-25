import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // ================= BASIC INFO =================
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: {
    unique: true,
    collation: { locale: "en", strength: 2 }, 
  },
    },

    password: {
      type: String, 
    },

    bio: {
      type: String,
      default: "",
    },

    profilePic: {
      type: String,
      default: "",
    },


    // ================= ACCOUNT VERIFICATION =================
    isAccountVerified: {
      type: Boolean,
      default: false,
    },

    verifyOtp: {
      type: String,
      default: "",
    },

    verifyOtpExpireAt: {
      type: Number,
      default: 0,
    },

    // ================= LOGIN OTP =================
    loginOtp: {
      type: String,
      default: "",
    },

    loginOtpExpireAt: {
      type: Number,
      default: 0,
    },

    // ================= PASSWORD RESET =================
    resetOtp: {
      type: String,
      default: "",
    },

    resetOtpExpireAt: {
      type: Number,
      default: 0,
    },

    // ================= GOOGLE OAUTH =================
    googleId: {
      type: String,
    },
    mutedChats: [{ type: String }],
    archivedChats: [{ type: String }],
    hiddenChats: [{ type: String }],
    
    authProvider: {
      type: String,
      enum: ["email", "google"],
      default: "email",
    },
    isAdmin: { type: Boolean, default: false },
    publicUserId: { type: String, unique: true }, //
    isSearchable: { type: Boolean, default: true }, //
    allowChatRequests: { type: Boolean, default: true }, //
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    fcmToken: { type: String, default: "" }, // FIREBASE CLOUD MESSAGING TOKEN
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
