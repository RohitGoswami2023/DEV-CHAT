// middleware/adminAuth.js
import User from "../models/User.js";

export const adminRoute = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user && user.isAdmin) {
      next();
    } else {
      res.status(403).json({ success: false, message: "Access denied. Admins only." });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};