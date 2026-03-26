import User from "../models/User.js";
import Group from "../models/Group.js";
import Message from "../models/Message.js";
import CallLog from "../models/CallLog.js";
import mongoose from "mongoose";
import { io, userSocketMap } from "../lib/socket.js"; // Import socket map to count online users

export const getDashboardStats = async (req, res) => {
  try {
    // 1. Count Documents
    const totalUsers = await User.countDocuments();
    const totalGroups = await Group.countDocuments();
    const totalMessages = await Message.countDocuments();

    // 2. GROWTH: New Users (24h)
    const newUsers24h = await User.countDocuments({ 
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
    });

    // 3. SECURITY: Suspicious Users (Failed login attempts > 3)
    const suspiciousUsers = await User.countDocuments({ failedLoginAttempts: { $gt: 3 } });

    // 4. CALLS: Activity
    const ongoingCalls = await CallLog.countDocuments({ status: "ongoing" });
    const totalCallsToday = await CallLog.countDocuments({ 
      startTime: { $gte: new Date().setHours(0,0,0,0) } 
    });

    // 5. Calculate Active Users (from Socket Map)
    const activeUsers = Object.keys(userSocketMap).length;

    // 6. Get Database Storage Stats
    const stats = await mongoose.connection.db.stats();
    const dbSizeBytes = stats.dataSize; 
    const dbSizeMB = (dbSizeBytes / (1024 * 1024)).toFixed(2);

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        newUsers24h,
        totalGroups,
        totalMessages,
        ongoingCalls,
        totalCallsToday,
        suspiciousUsers,
        dbSizeMB,
      }
    });
  } catch (error) {
    console.error("Admin Stats Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
};