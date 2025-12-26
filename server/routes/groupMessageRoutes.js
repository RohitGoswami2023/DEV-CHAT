import express from "express";
import {
  sendGroupMessage,
  getGroupMessages,
  deleteGroupMessage,
} from "../controllers/groupMessageController.js";
import { protectRoute } from "../middleware/auth.js";

const router = express.Router();

router.post("/send", protectRoute, sendGroupMessage);
router.get("/:groupId", protectRoute, getGroupMessages);
router.delete("/:messageId", protectRoute, deleteGroupMessage);

export default router;
