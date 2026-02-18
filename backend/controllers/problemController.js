import Problem from "../models/problem.js";

// Create Problem eployee banayega
export const createProblem = async (req, res) => {
  try {
    const { title, description } = req.body;

    const problem = await Problem.create({
      title,
      description,
      raisedBy: req.user.id,
    });

    res.status(201).json(problem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//All problems
export const getProblems = async (req, res) => {
  try {
    const problems = await Problem.find()
      .populate("raisedBy", "name email")
      .populate("acceptedBy", "name email")
      .populate("solution");

    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// accept problem show
export const acceptProblem = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);

    if (!problem)
      return res.status(404).json({ message: "Problem not found" });

    if (problem.status !== "Open")
      return res.status(400).json({ message: "Already accepted" });

    problem.acceptedBy = req.user.id;
    problem.status = "In Progress";

    await problem.save();

    res.json(problem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
