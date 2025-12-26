import express from "express";
import {
  googleLogin,
  signup,
  verifySignupOtp,
  login,
  verifyLoginOtp,
  updateProfile,
  getAllUsers,
  checkAuth,
  sendResetOtp,
  resetPassword,
  deleteAccount,
  updatePrivacy,
  toggleBlockUser,
  getBlockedUsers,
  toggleMute,
} from "../controllers/userController.js";
import { protectRoute } from "../middleware/auth.js";

const userRouter = express.Router();

// Signup & verification
userRouter.post("/signup", signup);
userRouter.post("/verify-signup-otp", verifySignupOtp);

// Login & verification
userRouter.post("/google-login", googleLogin);
userRouter.post("/login", login);
userRouter.post("/verify-login-otp", verifyLoginOtp);

// Password reset
userRouter.post("/send-reset-otp", sendResetOtp);
userRouter.post("/reset-password", resetPassword);

// Profile & auth
userRouter.put("/update-profile", protectRoute, updateProfile);
userRouter.get("/check", protectRoute, checkAuth);
userRouter.get("/users", protectRoute, getAllUsers);

// --- FIXED ROUTES TO MATCH FRONTEND ---
userRouter.put("/update-privacy", protectRoute, updatePrivacy); // Was "/privacy"
userRouter.post("/block-toggle", protectRoute, toggleBlockUser); // Was "/block"
userRouter.get("/blocked-users", protectRoute, getBlockedUsers); // Was "/blocked-list"

// delete user
userRouter.delete("/delete-account", protectRoute, deleteAccount);


userRouter.post("/mute", protectRoute, toggleMute);
export default userRouter;