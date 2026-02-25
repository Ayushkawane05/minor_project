import express from "express";
import { getAdminStats, getLeaderboard, getUserHistory } from "../controllers/adminController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public leaderboard for all authenticated users
router.get("/leaderboard", protect, getLeaderboard);
router.get("/leaderboard/:id/history", protect, getUserHistory);

// Only admin should access this (checking role in controller or middleware)
router.get("/stats", protect, (req, res, next) => {
    if (req.user.role !== "Admin") {
        return res.status(403).json({ message: "Not authorized as an admin" });
    }
    next();
}, getAdminStats);

export default router;
