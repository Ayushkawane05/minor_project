import User from "../models/user.js";
import Problem from "../models/problem.js";

export const getAdminStats = async (req, res) => {
    try {
        const usersCount = await User.countDocuments({ role: "Employee" });
        const problemsCount = await Problem.countDocuments();

        const statusStats = await Problem.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        const topSolvers = await User.find({ role: { $in: ["Employee", "HR"] } })
            .sort({ totalPoints: -1 })
            .limit(5)
            .select("name email role totalPoints averageRating problemsSolved");

        const activityData = await User.find({ role: "Employee" })
            .select("name problemsSolved problemsRaised totalPoints");

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
