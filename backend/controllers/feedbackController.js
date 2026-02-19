import Feedback from "../models/feedback.js";
import Solution from "../models/solution.js";
import User from "../models/user.js";

export const giveFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body; // deepseek api lagana hai
    const { solutionId } = req.params;

    const solution = await Solution.findById(solutionId).populate("solvedBy"); //emply id

    if (!solution)
      return res.status(404).json({ message: "Solution not found" });

    // AI Sentiment Analysis (Mock)
    let sentimentLabel = "Neutral";
    let sentimentScore = 0.5;

    const positiveWords = ["good", "great", "excellent", "solved", "best", "fast", "thanks", "amazing"];
    const negativeWords = ["bad", "poor", "worst", "slow", "wrong", "broken", "useless"];

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

    const existingFeedback = await Feedback.findOne({ solution: solutionId });
    if (existingFeedback) {
      return res.status(400).json({ message: "Feedback already given for this solution" });
    }

    const feedback = await Feedback.create({
      solution: solutionId,
      problem: solution.problem,
      givenBy: req.user.id,
      receivedBy: solution.solvedBy._id,
      rating,
      comment,
      sentimentLabel,
      sentimentScore,
    });

    // Update the Problem model to reflect feedback status
    await Problem.findByIdAndUpdate(solution.problem, {
      rating,
      feedbackComment: comment
    });

    // Update user stats
    const user = await User.findById(solution.solvedBy._id);

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
    res.status(500).json({ message: error.message });
  }
};
