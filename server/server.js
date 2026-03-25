import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import { Server } from "socket.io";
import groupRoutes from "./routes/groupRoutes.js";
import GroupMessageRoutes from "./routes/groupMessageRoutes.js";
import ChatRequestRoutes from "./routes/ChatRequestRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
// 👇 IMPORT ADMIN ROUTES HERE
import adminRoutes from "./routes/adminRoutes.js"; 
// import helmet from "helmet"; 
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

// 2. CORS (Allow Frontend)
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"]
  })
);

// 3. Security Middleware (After Body Parsers)
// app.use(helmet()); 

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
export const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  },
});

export const userSocketMap = {};

io.on("connection", (socket) => {
  const userId = socket.handshake.query?.userId;

  if (!userId) {
    console.warn("Socket connected without userId");
    return;
  }

  console.log("User Connected:", userId);
  userSocketMap[userId] = socket.id;

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("User Disconnected:", userId);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
  });
});

// ================= ROUTES =================
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);
app.use("/api/groups", groupRoutes);
app.use("/api/group-messages", GroupMessageRoutes);
app.use("/api/chat-requests", ChatRequestRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/admin", adminRoutes); // ✅ This will work now

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
  .then(() =>
    server.listen(PORT, () =>
      console.log(`Server running on PORT ${PORT}`)
    )
  )
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });