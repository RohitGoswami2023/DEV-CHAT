import express from "express";
import { createScheduled, getMyScheduled, cancelScheduled } from "../controllers/scheduledMessageController.js";
import { protectRoute } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protectRoute, createScheduled);
router.get("/my", protectRoute, getMyScheduled);
router.delete("/:id", protectRoute, cancelScheduled);

export default router;
