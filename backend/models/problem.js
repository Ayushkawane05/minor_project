import mongoose from "mongoose";

const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      enum: ["Technical", "HR", "Finance", "Operations", "Other"],
      default: "Other",
    },

    problemId: {
      type: String,
      unique: true,
      required: true,
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "hard"],
      default: "Medium",
    },

    // Who raised the problem
    raisedBy: {
      type: String, // Stores userId
      required: true,
    },

    // who accepted / solving it
    assignedTo: {
      type: String, // Stores userId
      default: null,
    },

    status: {
      type: String,
      enum: [
        "Open",
        "In Progress",
        "Solved",
        "Reviewed",
        "Closed",
      ],
      default: "Open",
    },

    aiScore: {
      type: Number,
      default: 0,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
    },

    feedbackComment: {
      type: String,
    },

    acceptedAt: {
      type: Date,
    },

    solvedAt: {
      type: Date,
    },

    closedAt: {
      type: Date,
    },

    acceptedBy: {
      type: String, // Stores userId
      default: null,
    },
  },
  { timestamps: true }
);


//time calculation justfor normal use
problemSchema.virtual("resolutionTime").get(function () {
  if (this.solvedAt && this.acceptedAt) {
    const diff = this.solvedAt - this.acceptedAt;
    return Math.floor(diff / (1000 * 60 * 60));
  }
  return null;
});

problemSchema.set("toJSON", { virtuals: true });
problemSchema.set("toObject", { virtuals: true });


// Virtual for solution
problemSchema.virtual("solution", {
  ref: "Solution",
  localField: "problemId",
  foreignField: "problem",
  justOne: true,
});

problemSchema.virtual("creator", {
  ref: "User",
  localField: "raisedBy",
  foreignField: "userId",
  justOne: true,
});

problemSchema.virtual("solver", {
  ref: "User",
  localField: "acceptedBy",
  foreignField: "userId",
  justOne: true,
});

const Problem = mongoose.model("Problem", problemSchema);

export default Problem;
