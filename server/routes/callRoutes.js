import express from "express";
import { protectRoute } from "../middleware/authMiddleware.js";
import { getCallLogsByUserId } from "../controllers/callController.js";

const router = express.Router();

router.get("/history", protectRoute, getCallLogsByUserId);

export default router;
