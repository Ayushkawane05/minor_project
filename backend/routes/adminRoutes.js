import express from "express";
import { getAdminStats } from "../controllers/adminController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Only admin should access this (checking role in controller or middleware)
router.get("/stats", protect, (req, res, next) => {
    if (req.user.role !== "Admin") {
        return res.status(403).json({ message: "Not authorized as an admin" });
    }
    next();
}, getAdminStats);

export default router;
