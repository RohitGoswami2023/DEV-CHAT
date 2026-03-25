import express from "express";
import { protectRoute } from "../middleware/auth.js";
import {
  createGroup,
  joinGroup,
  promoteToAdmin,
  leaveGroup,
  deleteGroup,
  getMyGroups,
  updateGroup,
  kickMember,
  demoteAdmin,
  approveJoinRequest,
  rejectJoinRequest,
  addFriendToGroup,
} from "../controllers/groupController.js";

const router = express.Router();

router.post("/create", protectRoute, createGroup);
router.post("/join", protectRoute, joinGroup);
router.post("/promote", protectRoute, promoteToAdmin);
router.post("/leave", protectRoute, leaveGroup);
router.post("/delete", protectRoute, deleteGroup);
router.get("/my", protectRoute, getMyGroups);
router.put("/update", protectRoute, updateGroup);
router.post("/kick", protectRoute, kickMember);
router.post("/demote", protectRoute, demoteAdmin);
router.post("/approve", protectRoute, approveJoinRequest);
router.post("/reject", protectRoute, rejectJoinRequest);
router.post("/add-friend", protectRoute, addFriendToGroup);


export default router;
