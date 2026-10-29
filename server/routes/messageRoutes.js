import express from "express";
import { protectRoute } from "../middleware/auth.js";
import {
  getMyChats,
  getMessage,
  sendMessage,
  getMessagesByRoom,
  createMessageWithIdempotency,
  deletePrivateChat,
  deletePrivateMessage,
  consumeViewOnce,
} from "../controllers/messageController.js";

const router = express.Router();

router.get("/chats", protectRoute, getMyChats);
router.get("/messages", protectRoute, getMessagesByRoom);
router.get("/", protectRoute, (req, res, next) => {
  if (req.query.roomId) {
    return getMessagesByRoom(req, res);
  }
  next();
});
router.post("/messages", protectRoute, createMessageWithIdempotency);
router.post("/", protectRoute, (req, res, next) => {
  if (req.body.clientId && req.body.roomId) {
    return createMessageWithIdempotency(req, res);
  }
  next();
});
router.get("/:id", protectRoute, getMessage);
router.post("/send/:id", protectRoute, sendMessage);
router.delete("/message/:messageId", protectRoute, deletePrivateMessage);
router.delete("/chat/:userId", protectRoute, deletePrivateChat);
router.post("/consume-view-once/:messageId", protectRoute, consumeViewOnce);

export default router;
