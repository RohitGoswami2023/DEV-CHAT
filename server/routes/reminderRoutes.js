import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { createReminder, deleteReminder, getReminders, getMyReminders } from "../controllers/reminderController.js";

const router = express.Router();

router.post("/", protectRoute, createReminder);
router.delete("/:id", protectRoute, deleteReminder);
router.get("/my", protectRoute, getMyReminders);
router.get("/:chatId", protectRoute, getReminders);

export default router;
