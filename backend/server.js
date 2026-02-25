import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

import authRoutes from './routes/authRoutes.js'
import problemRoutes from "./routes/problemRoutes.js";
import solutionRoutes from "./routes/solutionRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// Make io accessible to our routes
app.set("io", io);

app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/solutions", solutionRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("API is running with Socket.IO...");
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    httpServer.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => console.log(err));

export { io };
