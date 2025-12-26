import express from "express";
import { protectRoute } from "../middleware/auth.js";
import {
  getMyChats,
  getMessage,
  sendMessage,
  //deleteMessage,
  deletePrivateChat,
  deletePrivateMessage,
} from "../controllers/messageController.js";

const router = express.Router();

router.get("/chats", protectRoute, getMyChats);
router.get("/:id", protectRoute, getMessage);
router.post("/send/:id", protectRoute, sendMessage);
//router.delete("/delete/:messageId", protectRoute, deleteMessage);
router.delete("/message/:messageId", protectRoute, deletePrivateMessage);
router.delete("/chat/:userId", protectRoute, deletePrivateChat);

export default router;
