import Solution from "../models/solution.js";
import Problem from "../models/problem.js";

// image ka option use kar sakte
export const submitSolution = async (req, res) => {
  try {
    const { solutionText } = req.body;
    const { problemId } = req.params;

    const problem = await Problem.findById(problemId);

    if (!problem)
      return res.status(404).json({ message: "Problem not found" });

    if (problem.acceptedBy.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    const solution = await Solution.create({
      problem: problemId,
      solvedBy: req.user.id,
      content:solutionText,
    });

    console.log(solution);
    problem.status = "Solved";
    await problem.save();

    res.status(201).json(solution);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
