import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/user.js";

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("Connected to MongoDB");

        // Check for admin
        const admin = await User.findOne({ role: "Admin" });
        if (admin) {
            console.log("Admin exists:", admin.email);
            // We can't see the password because it's hashed, but we can reset it if needed.
            // For now, let's just create a new known admin if one doesn't exist or just report.
        } else {
            console.log("No admin found. Creating one...");
            const newAdmin = await User.create({
                name: "Admin User",
                email: "admin@company.com",
                password: "admin123", // Will be hashed by pre-save hook
                role: "Admin"
            });
            console.log("Admin created: admin@company.com / admin123");
        }
        process.exit();
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
