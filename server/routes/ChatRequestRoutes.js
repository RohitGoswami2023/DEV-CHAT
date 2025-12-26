import express from "express";
import { protectRoute } from "../middleware/auth.js";
import {
  sendChatRequest,
  acceptChatRequest,
  rejectChatRequest,
  deleteChatRequest,
  getMyRequests,
} from "../controllers/ChatRequestController.js";

const router = express.Router();

router.post("/send", protectRoute, sendChatRequest);
router.post("/accept", protectRoute, acceptChatRequest);
router.post("/reject", protectRoute, rejectChatRequest);
router.delete("/:requestId", protectRoute, deleteChatRequest);
router.get("/incoming", protectRoute, getMyRequests);

export default router;
