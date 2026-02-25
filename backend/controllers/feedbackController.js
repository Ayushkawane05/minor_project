import Feedback from "../models/feedback.js";
import Solution from "../models/solution.js";
import User from "../models/user.js";
import Problem from "../models/problem.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { generateId } from "../utils/idGenerator.js";

dotenv.config();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const giveFeedback = async (req, res) => {
  try {
    const { rating, comment, role } = req.body;
    const { solutionId } = req.params;

    const solution = await Solution.findById(solutionId).populate("solvedBy");

    if (!solution)
      return res.status(404).json({ message: "Solution not found" });

    // AI Sentiment Analysis
    let sentimentLabel = "Neutral";
    let sentimentScore = 0.5;

    try {
      if (process.env.GEMINI_API_KEY) {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `Analyze the sentiment of the following feedback comment for a work solution. Go through each word and on basis of comment not rating. 
        Comment: "${comment}"
        Rating provided: ${rating}/5
        Role: ${role}
        
        Return ONLY a JSON object with the following format (no markdown, just raw JSON):
        {
          "sentimentLabel": "Positive" | "Neutral" | "Negative",
          "sentimentScore": <number between 0.1 and 1.0>
        }`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const analysis = JSON.parse(jsonStr);

        sentimentLabel = analysis.sentimentLabel;
        sentimentScore = analysis.sentimentScore;
      } else {
        throw new Error("No Gemini API Key provided.");
      }
    } catch (aiError) {
      console.warn("Gemini API failed or key missing, falling back to simple analysis:", aiError.message);

      // Fallback: Simple keyword analysis
      const positiveWords = ["good", "great", "excellent", "solved", "best", "fast", "thanks", "amazing", "help"];
      const negativeWords = ["bad", "poor", "worst", "slow", "wrong", "broken", "useless", "late"];

      const commentLower = comment.toLowerCase();
      const posCount = positiveWords.filter(w => commentLower.includes(w)).length;
      const negCount = negativeWords.filter(w => commentLower.includes(w)).length;

      if (rating >= 4 || posCount > negCount) {
        sentimentLabel = "Positive";
        sentimentScore = 0.8 + (rating / 50);
      } else if (rating <= 2 || negCount > posCount) {
        sentimentLabel = "Negative";
        sentimentScore = 0.2 - (negCount / 50);
      }
    }

    const existingFeedback = await Feedback.findOne({ solution: solution.solutionId });
    if (existingFeedback) {
      return res.status(400).json({ message: "Feedback already given for this solution" });
    }

    const feedback = await Feedback.create({
      feedbackId: generateId("FDB"),
      solution: solution.solutionId,
      problem: solution.problem,
      givenBy: req.user.userId,
      receivedBy: solution.solvedBy, // solutions.solvedBy is userId string
      rating,
      comment,
      sentimentLabel,
      sentimentScore,
    });

    // Update the Problem model to reflect feedback status
    await Problem.findOneAndUpdate({ problemId: solution.problem }, {
      rating,
      feedbackComment: comment
    });

    // Update user stats
    const user = await User.findOne({ userId: solution.solvedBy });

    // Calculate score based on rating, sentiment, and role multiplier
    // Employee: 20, HR: 25, Admin: 30
    const roleMultiplier = user.role === "Admin" ? 30 : user.role === "HR" ? 25 : 20;
    const contributionScore = rating * sentimentScore * roleMultiplier;

    user.totalPoints = (user.totalPoints || 0) + contributionScore;

    // Update average rating
    const totalSolved = user.problemsSolved.length || 1;
    const currentAvg = user.averageRating || 0;
    const newAvg = ((currentAvg * (totalSolved - 1)) + rating) / totalSolved;
    user.averageRating = parseFloat(newAvg.toFixed(1));

    await user.save();

    res.status(201).json(feedback);
  } catch (error) {
    console.error("Feedback Error:", error);
    res.status(500).json({ message: error.message });
  }
};
