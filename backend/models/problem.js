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

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "hard"],
      default: "Medium",
    },

    // Who raised the problem
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // who accepted / solving it
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
  localField: "_id",
  foreignField: "problem",
  justOne: true,
});

const Problem = mongoose.model("Problem", problemSchema);

export default Problem;
