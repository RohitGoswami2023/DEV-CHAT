// routes/adminRoutes.js
import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { adminRoute } from "../middleware/adminAuth.js";
import { getDashboardStats } from "../controllers/adminController.js";

const router = express.Router();

// Protect with Login Check AND Admin Check
router.get("/stats", protectRoute, adminRoute, getDashboardStats);

export default router;