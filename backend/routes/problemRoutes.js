import express from "express";
import {
  createProblem,
  getProblems,
  acceptProblem,
} from "../controllers/problemController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createProblem);
router.get("/", protect, getProblems);
router.put("/:id/accept", protect, acceptProblem);

export default router;
