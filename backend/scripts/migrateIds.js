import mongoose from "mongoose";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const generateId = (prefix) => {
    return `${prefix}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
};

async function migrate() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        console.log("Connected to MongoDB for migration...");

        const users = await db.collection("users").find({}).toArray();
        const userMap = {};
        for (const user of users) {
            let userId = user.userId;
            if (!userId) {
                userId = generateId("USR");
                await db.collection("users").updateOne({ _id: user._id }, { $set: { userId } });
            }
            userMap[user._id.toString()] = userId;
        }
        console.log(`Verified/Updated ${users.length} users.`);

        const problems = await db.collection("problems").find({}).toArray();
        const problemMap = {};
        for (const problem of problems) {
            let problemId = problem.problemId;
            if (!problemId) {
                problemId = generateId("PRB");
                await db.collection("problems").updateOne({ _id: problem._id }, { $set: { problemId } });
            }
            problemMap[problem._id.toString()] = problemId;
        }
        console.log(`Verified/Updated ${problems.length} problems.`);

        const solutions = await db.collection("solutions").find({}).toArray();
        const solutionMap = {};
        for (const solution of solutions) {
            let solutionId = solution.solutionId;
            if (!solutionId) {
                solutionId = generateId("SOL");
                await db.collection("solutions").updateOne({ _id: solution._id }, { $set: { solutionId } });
            }
            solutionMap[solution._id.toString()] = solutionId;
        }
        console.log(`Verified/Updated ${solutions.length} solutions.`);

        const feedbacks = await db.collection("feedbacks").find({}).toArray();
        for (const feedback of feedbacks) {
            if (!feedback.feedbackId) {
                const feedbackId = generateId("FDB");
                await db.collection("feedbacks").updateOne({ _id: feedback._id }, { $set: { feedbackId } });
            }
        }
        console.log(`Verified/Updated ${feedbacks.length} feedbacks.`);

        // Update References
        for (const problem of problems) {
            const updates = {};
            if (problem.raisedBy && userMap[problem.raisedBy.toString()]) updates.raisedBy = userMap[problem.raisedBy.toString()];
            if (problem.acceptedBy && userMap[problem.acceptedBy.toString()]) updates.acceptedBy = userMap[problem.acceptedBy.toString()];
            if (problem.assignedTo && userMap[problem.assignedTo.toString()]) updates.assignedTo = userMap[problem.assignedTo.toString()];

            if (Object.keys(updates).length > 0) {
                await db.collection("problems").updateOne({ _id: problem._id }, { $set: updates });
            }
        }
        console.log("Updated Problem references.");

        for (const solution of solutions) {
            const updates = {};
            if (solution.problem && problemMap[solution.problem.toString()]) updates.problem = problemMap[solution.problem.toString()];
            if (solution.solvedBy && userMap[solution.solvedBy.toString()]) updates.solvedBy = userMap[solution.solvedBy.toString()];

            if (Object.keys(updates).length > 0) {
                await db.collection("solutions").updateOne({ _id: solution._id }, { $set: updates });
            }
        }
        console.log("Updated Solution references.");

        for (const feedback of feedbacks) {
            const updates = {};
            if (feedback.problem && problemMap[feedback.problem.toString()]) updates.problem = problemMap[feedback.problem.toString()];
            if (feedback.solution && solutionMap[feedback.solution.toString()]) updates.solution = solutionMap[feedback.solution.toString()];
            if (feedback.givenBy && userMap[feedback.givenBy.toString()]) updates.givenBy = userMap[feedback.givenBy.toString()];
            if (feedback.receivedBy && userMap[feedback.receivedBy.toString()]) updates.receivedBy = userMap[feedback.receivedBy.toString()];

            if (Object.keys(updates).length > 0) {
                await db.collection("feedbacks").updateOne({ _id: feedback._id }, { $set: updates });
            }
        }
        console.log("Updated Feedback references.");

        for (const user of users) {
            if (user.problemsRaised || user.problemsSolved) {
                const raised = (user.problemsRaised || []).map(id => problemMap[id.toString()] || id);
                const solved = (user.problemsSolved || []).map(id => problemMap[id.toString()] || id);
                await db.collection("users").updateOne({ _id: user._id }, { $set: { problemsRaised: raised, problemsSolved: solved } });
            }
        }
        console.log("Updated User arrays.");

        console.log("MIGRATION SUCCESSFUL");
        process.exit(0);
    } catch (err) {
        console.error("MIGRATION FAILED", err);
        process.exit(1);
    }
}

migrate();
