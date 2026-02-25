import Solution from "../models/solution.js";
import Problem from "../models/problem.js";
import User from "../models/user.js";
import { generateId } from "../utils/idGenerator.js";

// image ka option use kar sakte
export const submitSolution = async (req, res) => {
  try {
    const { solutionText } = req.body;
    const { problemId } = req.params; // This is the MongoDB _id from the route

    const problem = await Problem.findById(problemId);

    if (!problem)
      return res.status(404).json({ message: "Problem not found" });

    if (problem.acceptedBy !== req.user.userId)
      return res.status(403).json({ message: "Not authorized" });

    const solution = await Solution.create({
      solutionId: generateId("SOL"),
      problem: problem.problemId,
      solvedBy: req.user.userId,
      content: solutionText,
    });

    console.log(solution);
    problem.status = "Solved";
    problem.solvedAt = new Date();
    await problem.save();

    // Add to user's solved problems
    await User.findOneAndUpdate({ userId: req.user.userId }, {
      $addToSet: { problemsSolved: problem.problemId }
    });

    const populatedSolution = await Solution.findById(solution._id)
      .populate("solverDetails", "name email")
      .populate("problemDetails");

    // Emit event to notify that a solution has been submitted
    req.app.get("io").emit("solutionSubmitted", populatedSolution);

    res.status(201).json(solution);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
