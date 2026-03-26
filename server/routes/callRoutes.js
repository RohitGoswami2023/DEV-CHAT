import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { getCallLogsByUserId, deleteCallLog } from "../controllers/callController.js";

const router = express.Router();

router.get("/history", protectRoute, getCallLogsByUserId);
router.delete("/:id", protectRoute, deleteCallLog);

export default router;
