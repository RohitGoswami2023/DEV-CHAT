import { OAuth2Client } from "google-auth-library";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { generateToken } from "../lib/utils.js";
import { generateOTP } from "../lib/otpGenerator.js";
import { sendOTPEmail } from "../lib/mailer.js";
import cloudinary from "../lib/cloudinary.js";
import { generatePublicUserId } from "../lib/generatePublicUserId.js";
import { io, userSocketMap } from "../server.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ---------------- SIGNUP (EMAIL + OTP) ----------------
export const signup = async (req, res) => {
  const { fullName, email, password, bio } = req.body;

  try {
    if (!fullName || !email || !password || !bio) {
      return res.json({ success: false, message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });

if (existingUser) {
  return res.json({
    success: false,
    message:
      existingUser.authProvider === "google"
        ? "This email is registered via Google. Please login with Google."
        : "Account already exists",
  });
}

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const publicUserId = await generatePublicUserId();

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      bio,
      authProvider: "email",
      publicUserId,
    });

    const otp = generateOTP();
    newUser.verifyOtp = otp;
    newUser.verifyOtpExpireAt = Date.now() + 5 * 60 * 1000;
    await newUser.save();

    await sendOTPEmail(newUser.email, otp);

    res.json({
      success: true,
      message: "Account created. Verify your email with the OTP sent.",
      userId: newUser._id,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};


// ---------------- VERIFY SIGNUP OTP ----------------
export const verifySignupOtp = async (req, res) => {
  const { userId, otp } = req.body;
  if (!userId || !otp)
    return res.json({ success: false, message: "Missing details" });

  try {
    const user = await User.findById(userId);
    if (!user) return res.json({ success: false, message: "User not found" });
    if (user.verifyOtp !== otp)
      return res.json({ success: false, message: "Invalid OTP" });
    if (user.verifyOtpExpireAt < Date.now())
      return res.json({ success: false, message: "OTP expired" });

    user.isAccountVerified = true;
    user.verifyOtp = "";
    user.verifyOtpExpireAt = 0;
    await user.save();

    const token = generateToken(user._id);
    res.json({ success: true, message: "Email verified", token, userData: user });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ---------------- LOGIN (EMAIL + OTP) ----------------
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ success: false, message: "Invalid credentials" });

    //  BLOCK GOOGLE USERS
    if (user.authProvider === "google") {
      return res.status(400).json({
        success: false,
        message: "Use Google login for this account",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect)
      return res.status(400).json({ success: false, message: "Invalid credentials" });

    if (!user.isAccountVerified) {
      const otp = generateOTP();
      user.verifyOtp = otp;
      user.verifyOtpExpireAt = Date.now() + 5 * 60 * 1000;
      await user.save();

      await sendOTPEmail(user.email, otp);

      return res.json({
        success: true,
        message: "Account not verified. A new OTP has been sent to your email to verify your account.",
        userId: user._id,
        requiresSignupVerify: true
      });
    }

    const otp = generateOTP();
    user.loginOtp = otp;
    user.loginOtpExpireAt = Date.now() + 5 * 60 * 1000;
    await user.save();

    await sendOTPEmail(user.email, otp);

    res.json({
      success: true,
      message: "OTP sent to your email. Use it to complete login.",
      userId: user._id,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- VERIFY LOGIN OTP ----------------
export const verifyLoginOtp = async (req, res) => {
  const { userId, otp } = req.body;
  if (!userId || !otp)
    return res.json({ success: false, message: "Missing details" });

  try {
    const user = await User.findById(userId);
    if (!user) return res.json({ success: false, message: "User not found" });
    if (user.loginOtp !== otp)
      return res.json({ success: false, message: "Invalid OTP" });
    if (user.loginOtpExpireAt < Date.now())
      return res.json({ success: false, message: "OTP expired" });

    user.loginOtp = "";
    user.loginOtpExpireAt = 0;
    await user.save();

    const token = generateToken(user._id);
    res.json({ success: true, message: "Login successful", token, userData: user });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ---------------- SEND RESET OTP ----------------
export const sendResetOtp = async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.json({ success: false, message: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });

    //  BLOCK GOOGLE USERS
    if (user.authProvider === "google") {
      return res.json({
        success: false,
        message: "Google accounts do not support password reset",
      });
    }

    const otp = generateOTP();
    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() + 5 * 60 * 1000;
    await user.save();

    await sendOTPEmail(user.email, otp);

    res.json({ success: true, message: "Reset OTP sent to your email" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- RESET PASSWORD ----------------
export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword)
    return res.json({ success: false, message: "All fields are required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });
    if (user.resetOtp !== otp)
      return res.json({ success: false, message: "Invalid OTP" });
    if (user.resetOtpExpireAt < Date.now())
      return res.json({ success: false, message: "OTP expired" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetOtp = "";
    user.resetOtpExpireAt = 0;
    await user.save();

    res.json({ success: true, message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- UPDATE PROFILE ----------------
export const updateProfile = async (req, res) => {
  try {
    const { profilePic, bio, fullName } = req.body;
    const userId = req.user._id;

    let updatedUser;

    if (profilePic) {
      const upload = await cloudinary.uploader.upload(profilePic);
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { profilePic: upload.secure_url, bio, fullName },
        { new: true }
      );
    } else {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { bio, fullName },
        { new: true }
      );
    }

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- CHECK AUTH ----------------
export const checkAuth = (req, res) => {
  res.json({ success: true, user: req.user });
};

// ---------------- GET ALL USERS ----------------
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "_id fullName profilePic bio");
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- GOOGLE OAUTH LOGIN ----------------
export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub, email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ email });

    // 🔒 CASE 1: Email already exists (OTP account)
    if (user) {
      if (user.authProvider === "email") {
        return res.status(400).json({
          success: false,
          message:
            "This email is already registered using OTP. Please login with OTP.",
        });
      }

      // Google already linked
      const token = generateToken(user._id);
      return res.json({ success: true, token, userData: user });
    }

    // 🔒 CASE 2: New Google user
    user = await User.create({
      fullName: name,
      email,
      googleId: sub,
      authProvider: "google",
      isAccountVerified: true,
      profilePic: picture,
      publicUserId: await generatePublicUserId(),
    });

    const jwtToken = generateToken(user._id);

    res.json({ success: true, token: jwtToken, userData: user });
  } catch (err) {
    res.status(401).json({ success: false, message: "Google auth failed" });
  }
};


// ---------------- DELETE ACCOUNT ----------------
export const deleteAccount = async (req, res) => {
  try {
    const { confirmation } = req.body;
    const userId = req.user._id;

    if (!confirmation || confirmation.toLowerCase() !== "yes i am sure") {
      return res.status(400).json({
        success: false,
        message: 'Type "yes i am sure" to delete your account',
      });
    }

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: "Account deleted permanently",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updatePrivacy = async (req, res) => {
  const { allowChatRequests, isSearchable } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { allowChatRequests, isSearchable },
    { new: true }
  );

  res.json({ success: true, user });
};




// ---------------- BLOCK / UNBLOCK USER ----------------
export const toggleBlockUser = async (req, res) => {
  try {
    const myId = req.user._id;
    const { targetUserId } = req.body;

    if (myId.toString() === targetUserId) {
      return res.status(400).json({ success: false, message: "You cannot block yourself" });
    }

    const user = await User.findById(myId);
    const isBlocked = user.blockedUsers.includes(targetUserId);

    if (isBlocked) {
      // Unblock logic
      await User.findByIdAndUpdate(myId, { $pull: { blockedUsers: targetUserId } });
      
      const targetSocket = userSocketMap[targetUserId];
      if (targetSocket) {
        io.to(targetSocket).emit("unblockedBy", { userId: myId.toString() });
      }

      res.json({ success: true, message: "User unblocked" });
    } else {
      // Block logic
      await User.findByIdAndUpdate(myId, { $addToSet: { blockedUsers: targetUserId } });
      
      const targetSocket = userSocketMap[targetUserId];
      if (targetSocket) {
        io.to(targetSocket).emit("blockedBy", { userId: myId.toString() });
      }

      res.json({ success: true, message: "User blocked" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- GET BLOCKED USERS ----------------
export const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("blockedUsers", "fullName profilePic publicUserId");
    
    res.json({ success: true, blockedUsers: user.blockedUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ---------------- TOGGLE MUTE ----------------
export const toggleMute = async (req, res) => {
  try {
    const myId = req.user._id;
    const { chatId } = req.body; // Can be userId or groupId

    const user = await User.findById(myId);
    const isMuted = user.mutedChats.includes(chatId);

    if (isMuted) {
      // Unmute
      await User.findByIdAndUpdate(myId, { $pull: { mutedChats: chatId } });
      res.json({ success: true, message: "Notifications unmuted", isMuted: false });
    } else {
      // Mute
      await User.findByIdAndUpdate(myId, { $addToSet: { mutedChats: chatId } });
      res.json({ success: true, message: "Notifications muted", isMuted: true });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- TOGGLE ARCHIVE ----------------
export const toggleArchive = async (req, res) => {
  try {
    const myId = req.user._id;
    const { chatId } = req.body;

    const user = await User.findById(myId);
    const isArchived = user.archivedChats.includes(chatId);

    if (isArchived) {
      // Unarchive
      await User.findByIdAndUpdate(myId, { $pull: { archivedChats: chatId } });
      res.json({ success: true, message: "Chat unarchived", isArchived: false });
    } else {
      // Archive
      await User.findByIdAndUpdate(myId, { $addToSet: { archivedChats: chatId } });
      res.json({ success: true, message: "Chat archived", isArchived: true });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};