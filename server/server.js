import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import { initSocket, io, userSocketMap } from "./lib/socket.js";
import groupRoutes from "./routes/groupRoutes.js";
import GroupMessageRoutes from "./routes/groupMessageRoutes.js";
import ChatRequestRoutes from "./routes/ChatRequestRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import reminderRoutes from "./routes/reminderRoutes.js";
import scheduledMessageRoutes from "./routes/scheduledMessageRoutes.js";
import ScheduledMessage from "./models/ScheduledMessage.js";
import callRoutes from "./routes/callRoutes.js";
import { createCallLogEntry } from "./controllers/callController.js";
// Cron dependencies
import Reminder from "./models/Reminder.js";
import Message from "./models/Message.js";
import GroupMessage from "./models/GroupMessage.js";
import User from "./models/User.js";
import admin from "./lib/firebaseAdmin.js";
import { sendReminderEmail } from "./lib/mailer.js";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();
const MSG_SECRET = process.env.MESSAGE_SECRET_KEY;
const encryptForCron = (text) => {
  if (!text || !MSG_SECRET) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(MSG_SECRET), iv);
  let enc = cipher.update(text, "utf8", "hex"); enc += cipher.final("hex");
  return `${iv.toString("hex")}:${enc}`;
};
import helmet from "helmet"; 
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";

const app = express();
const server = http.createServer(app);

// 🔥 CRITICAL: Trust Proxy for Render/Vercel
app.set("trust proxy", 1); 

// ================= STANDARD MIDDLEWARE (Order Matters!) =================
// 1. Body Parsers MUST come first
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// 2. Security & CORS
app.use((req, res, next) => {
  // Required for Google OAuth popups
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "https://dev-chat-tan.vercel.app",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"]
  })
);

// 3. Security Middleware (After Body Parsers)
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
      connectSrc: ["'self'", "https://accounts.google.com", "https://api.cloudinary.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://*.googleusercontent.com"],
      frameSrc: ["https://accounts.google.com"],
    },
  },
})); 
app.use(hpp()); 

// ✅ FIX: Make req.query writable before mongoSanitize runs
app.use((req, res, next) => {
  if (req.query) {
    Object.defineProperty(req, 'query', {
      value: req.query,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  next();
});

app.use(mongoSanitize()); 

// 4. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3000, // Limit each IP
  standardHeaders: true, 
  legacyHeaders: false, 
  message: "Too many requests from this IP, please try again later."
});
app.use("/api", limiter); 

// ================= SOCKET =================
const ioInstance = initSocket(server);



// ================= ROUTES =================
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);
app.use("/api/groups", groupRoutes);
app.use("/api/group-messages", GroupMessageRoutes);
app.use("/api/chat-requests", ChatRequestRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/scheduled", scheduledMessageRoutes);
app.use("/api/calls", callRoutes);

// --- SMTP DEBUG ROUTE ---
app.get("/api/debug/smtp", async (req, res) => {
  try {
    const { transporter } = await import("./lib/mailer.js");
    transporter.verify((error, success) => {
      if (error) {
        res.status(500).json({ success: false, message: "SMTP Connection Failed", error: error.message });
      } else {
        res.json({ success: true, message: "SMTP Server is ready" });
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Default route
app.get("/", (req, res) => {
  res.send("API is running... (Chat App)");
});

app.get("/api/status", (req, res) => {
  res.send("Server is live");
});

// ================= ERROR HANDLING =================
app.use((req, res) =>
  res.status(404).json({ message: "Route not found" })
);

app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

// ================= START =================
const PORT = process.env.PORT || 5001;

connectDB()
  .then(() => {
    server.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));

    /* ===================== SCHEDULED MESSAGE CRON =====================
       Runs every 60s. Finds unsent scheduled messages that are due.
    ================================================================ */
    setInterval(async () => {
      try {
        const now = new Date();
        const due = await ScheduledMessage.find({
          sent: false,
          cancelledAt: null,
          scheduledAt: { $lte: now },
        }).populate("senderId", "fullName profilePic").populate("receiverId");

        for (const sched of due) {
          const encText = encryptForCron(sched.text);
          const newMsg = await Message.create({
            senderId: sched.senderId._id,
            receiverId: sched.receiverId._id,
            text: encText,
            status: "sent",
          });

          const populated = await newMsg.populate([{ path: "senderId", select: "fullName profilePic" }]);
          
          const receiverSocket = userSocketMap[sched.receiverId._id.toString()];
          if (receiverSocket) io.to(receiverSocket).emit("newMessage", { ...populated._doc, text: sched.text });
          
          const senderSocket = userSocketMap[sched.senderId._id.toString()];
          if (senderSocket) io.to(senderSocket).emit("newMessage", { ...populated._doc, text: sched.text });

          sched.sent = true;
          await sched.save();
        }
      } catch (err) { console.error("Scheduled message cron error:", err.message); }
    }, 60000);

    /* ===================== REMINDER CRON WORKER =====================
       Runs every 60 seconds. Handles 15-min warnings and execution.
    ================================================================ */
    setInterval(async () => {
      try {
        const now = new Date();
        const in15 = new Date(now.getTime() + 15 * 60 * 1000);

        // Phase 1: 15-min warning
        const toWarn = await Reminder.find({
          executed: false,
          notified15Min: { $ne: true },
          scheduledAt: { $lte: in15 },
        }).populate("creatorId", "fullName email fcmToken");

        if (toWarn.length > 0) console.log(`[ReminderCron] Warning ${toWarn.length} reminders.`);

        for (const rem of toWarn) {
          rem.notified15Min = true;
          await rem.save();

          if (rem.creatorId?.fcmToken) {
            try {
              await admin.messaging().send({
                token: rem.creatorId.fcmToken,
                notification: { title: "⏰ Reminder in 15 min", body: rem.text.substring(0, 100) },
                data: { type: "reminder", chatId: rem.chatId, isGroup: String(rem.isGroup) },
              });
            } catch (e) { console.error("[Cron] FCM error:", e.message); }
          }

          if (rem.creatorId?.email && rem.sendEmail) {
            await sendReminderEmail(rem.creatorId.email, rem);
          }

          const warnPayload = { type: "reminder15MinWarning", reminder: rem };
          if (rem.isGroup) {
            const { default: Group } = await import("./models/Group.js");
            const grp = await Group.findById(rem.chatId);
            if (grp) grp.members.forEach(mid => { const s = userSocketMap[mid.toString()]; if (s) io.to(s).emit("reminderWarning", warnPayload); });
          } else {
            [rem.creatorId._id.toString(), rem.chatId].forEach(uid => { const s = userSocketMap[uid]; if (s) io.to(s).emit("reminderWarning", warnPayload); });
          }
        }

        // Phase 2: Execution
        const toExecute = await Reminder.find({
          executed: false,
          scheduledAt: { $lte: now },
        }).populate("creatorId", "fullName fcmToken");

        if (toExecute.length > 0) console.log(`[ReminderCron] Executing ${toExecute.length} reminders.`);

        for (const rem of toExecute) {
          rem.executed = true;
          await rem.save();

          try {
            if (rem.isGroup) {
              const msg = await GroupMessage.create({ group: rem.chatId, sender: rem.creatorId._id, text: rem.text });
              const populated = await msg.populate("sender", "fullName profilePic");
              const { default: Group } = await import("./models/Group.js");
              const grp = await Group.findById(rem.chatId);
              if (grp) grp.members.forEach(mid => { const s = userSocketMap[mid.toString()]; if (s) io.to(s).emit("newMessage", populated); });
            } else {
              const encText = encryptForCron(rem.text);
              const receiverOnline = userSocketMap[rem.chatId];
              const msg = await Message.create({ senderId: rem.creatorId._id, receiverId: rem.chatId, text: encText, status: receiverOnline ? "delivered" : "sent" });
              const plainMsg = { ...msg._doc, text: rem.text };
              if (receiverOnline) io.to(receiverOnline).emit("newMessage", plainMsg);
              const senderSocket = userSocketMap[rem.creatorId._id.toString()];
              if (senderSocket) io.to(senderSocket).emit("newMessage", plainMsg);
            }
          } catch (execErr) { console.error("Reminder execute error:", execErr.message); }

          const removePayload = { reminderId: rem._id.toString() };
          if (rem.isGroup) {
            const { default: Group } = await import("./models/Group.js");
            const grp = await Group.findById(rem.chatId);
            if (grp) grp.members.forEach(mid => { const s = userSocketMap[mid.toString()]; if (s) io.to(s).emit("reminderExecuted", removePayload); });
          } else {
            [rem.creatorId._id.toString(), rem.chatId].forEach(uid => { const s = userSocketMap[uid]; if (s) io.to(s).emit("reminderExecuted", removePayload); });
          }
        }
      } catch (cronErr) { console.error("[ReminderCron] error:", cronErr.message); }
    }, 60000);
  })
  .catch((err) => {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  });