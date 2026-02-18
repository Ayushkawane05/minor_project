import express from "express";
import { giveFeedback } from "../controllers/feedbackController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/:solutionId", protect, giveFeedback);

export default router;                                                    