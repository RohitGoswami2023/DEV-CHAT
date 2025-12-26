// controllers/adminController.js
import User from "../models/User.js";
import Group from "../models/Group.js";
import Message from "../models/Message.js";
import mongoose from "mongoose";
import { userSocketMap } from "../server.js"; // Import socket map to count online users

export const getDashboardStats = async (req, res) => {
  try {
    // 1. Count Documents
    const totalUsers = await User.countDocuments();
    const totalGroups = await Group.countDocuments();
    const totalMessages = await Message.countDocuments();

    // 2. Calculate Active Users (from Socket Map)
    const activeUsers = Object.keys(userSocketMap).length;

    // 3. Get Database Storage Stats
    // db.stats() returns size in bytes
    const stats = await mongoose.connection.db.stats();
    const dbSizeBytes = stats.dataSize; 
    
    // Convert to MB
    const dbSizeMB = (dbSizeBytes / (1024 * 1024)).toFixed(2);

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalGroups,
        totalMessages,
        dbSizeMB,
      }
    });
  } catch (error) {
    console.error("Admin Stats Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
};