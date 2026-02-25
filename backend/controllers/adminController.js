import User from "../models/user.js";
import Problem from "../models/problem.js";
import mongoose from "mongoose";

export const getAdminStats = async (req, res) => {
    try {
        const usersCount = await User.countDocuments({ role: "Employee" });
        const problemsCount = await Problem.countDocuments();

        const statusStats = await Problem.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        const topSolvers = await User.find({ role: { $in: ["Employee", "HR", "Admin"] } })
            .sort({ totalPoints: -1 })
            .select("name email role totalPoints averageRating problemsSolved userId");

        const activityData = await User.find({ role: "Employee" })
            .select("name problemsSolved problemsRaised totalPoints userId");

        res.json({
            summary: {
                totalEmployees: usersCount,
                totalProblems: problemsCount,
                statusDistribution: statusStats
            },
            topSolvers,
            employeeActivity: activityData
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getLeaderboard = async (req, res) => {
    try {
        const topSolvers = await User.find({ role: { $in: ["Employee", "HR", "Admin"] } })
            .sort({ totalPoints: -1 })
            .select("name email role totalPoints averageRating problemsSolved userId");
        res.json(topSolvers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUserHistory = async (req, res) => {
    try {
        // Find by either MongoDB _id or userId to be flexible
        const user = await User.findOne({
            $or: [{ _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : null }, { userId: req.params.id }]
        })
            .populate({
                path: "solvedProblems",
                select: "title category priority status rating solvedAt problemId",
                populate: {
                    path: "solution",
                    select: "sentimentScore content solutionId"
                }
            })
            .select("name role totalPoints problemsSolved userId");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
