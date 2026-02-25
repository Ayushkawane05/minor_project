import Problem from "../models/problem.js";
import { generateId } from "../utils/idGenerator.js";

// Create Problem eployee banayega
export const createProblem = async (req, res) => {
  try {
    const { title, description, category, priority } = req.body;

    const problem = await Problem.create({
      title,
      description,
      category: category || "Other",
      priority: priority || "Medium",
      raisedBy: req.user.userId,
      problemId: generateId("PRB"),
    });

    const populatedProblem = await Problem.findOne({ problemId: problem.problemId })
      .populate("creator", "name email");

    // Emit event to all connected clients (especially admins)
    req.app.get("io").emit("newProblem", populatedProblem);

    res.status(201).json(problem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//All problems
export const getProblems = async (req, res) => {
  try {
    let query = {};

    // Refined visibility: Employees see all Open/In Progress problems,
    // plus any problem they raised or accepted (solved) themselves.
    if (req.user.role === "Employee") {
      query = {
        $or: [
          { status: { $in: ["Open", "In Progress"] } },
          { raisedBy: req.user.userId },
          { acceptedBy: req.user.userId }
        ]
      };
    }

    const problems = await Problem.find(query)
      .populate("creator", "name email")
      .populate("solver", "name email")
      .populate("solution");

    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// accept problem show
export const acceptProblem = async (req, res) => {
  try {
    // Note: req.params.id is still the MongoDB _id for single document fetch, 
    // but we can transition to problemId if frontend sends it.
    // For now, let's keep _id for direct fetching but update the raisedBy check.
    const problem = await Problem.findById(req.params.id);

    if (!problem)
      return res.status(404).json({ message: "Problem not found" });

    if (problem.status !== "Open")
      return res.status(400).json({ message: "Already accepted" });

    // Prevent user from accepting their own problem
    if (problem.raisedBy === req.user.userId) {
      return res.status(403).json({ message: "You cannot accept your own problem" });
    }

    problem.acceptedBy = req.user.userId;
    problem.status = "In Progress";
    problem.acceptedAt = new Date();

    await problem.save();

    const populatedProblem = await Problem.findById(problem._id)
      .populate("creator", "name email")
      .populate("solver", "name email");

    // Emit event to the user who raised it and admins
    req.app.get("io").emit("problemUpdated", populatedProblem);

    res.json(problem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete problem
export const deleteProblem = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);

    if (!problem)
      return res.status(404).json({ message: "Problem not found" });

    // Only allow the person who raised it to delete it (or Admin)
    if (problem.raisedBy !== req.user.userId && req.user.role !== "Admin") {
      return res.status(403).json({ message: "Not authorized to delete this problem" });
    }

    await Problem.findByIdAndDelete(req.params.id);

    // Notify admins and other employees that a problem was deleted
    req.app.get("io").emit("problemDeleted", req.params.id);

    res.json({ message: "Problem deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
