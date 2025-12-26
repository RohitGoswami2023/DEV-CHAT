import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { globalUserSearch } from "../controllers/searchController.js";

const router = express.Router();

router.get("/users", protectRoute, globalUserSearch);

export default router;
