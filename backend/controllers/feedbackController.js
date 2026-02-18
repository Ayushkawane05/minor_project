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

    const feedback = await Feedback.create({
      solution: solutionId,
      problem: solution.problem,
      givenBy: req.user.id,
      receivedBy: solution.solvedBy._id,
      rating,
      comment,
      sentiment: rating >= 4 ? "positive" : rating === 3 ? "neutral" : "negative", // ai wala section
    });

    // Update user stats
    const user = await User.findById(solution.solvedBy._id);

    // We can use problemsSolved array length as the count of solved problems
    const totalSolved = user.problemsSolved.length || 1;

    // Calculate new average rating
    // If it's the first rating, just set it. Otherwise, weighted average.
    // Note: totalSolved might be 0 if not updated yet, so handle that.
    const currentAvg = user.averageRating || 0;
    const newAvg = ((currentAvg * (totalSolved - 1)) + rating) / totalSolved;

    user.averageRating = parseFloat(newAvg.toFixed(1)); // Keep 1 decimal

    await user.save();

    res.status(201).json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
