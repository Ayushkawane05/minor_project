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
      givenBy: req.user.id,
      receivedBy: solution.solvedBy._id,
      rating,
      comment,
      sentiment: rating >= 4 ? "positive" : rating === 3 ? "neutral" : "negative", // ai wala section
    });

    // Update user score
    const user = await User.findById(solution.solvedBy._id);
    user.totalSolved += 1;
    user.helpingScore =
      (user.helpingScore + rating) / user.totalSolved;

    await user.save();

    res.status(201).json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
