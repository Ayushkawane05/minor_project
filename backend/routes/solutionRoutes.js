import express from "express";
import { submitSolution } from "../controllers/solutionController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/:problemId", protect, submitSolution);

export default router;
