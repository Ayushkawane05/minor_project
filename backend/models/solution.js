import mongoose from "mongoose";

const solutionSchema = new mongoose.Schema(
  {
    solutionId: {
      type: String,
      unique: true,
      required: true,
    },

    // which problem this solution belongs to
    problem: {
      type: String, // Stores problemId
      required: true,
    },

    // Who solved it
    solvedBy: {
      type: String, // Stores userId
      required: true,
    },

    // main solution content
    content: {
      type: String,
      required: true,
    },

    // optional attachments (screenshots, docs, ) url use karege (cloudinary )
    attachments: [
      {
        type: String,
      },
    ],

    //  ai evaluation fields
    clarityScore: {
      type: Number,
      default: 0,
    },

    technicalScore: {
      type: Number,
      default: 0,
    },

    effortScore: {
      type: Number,
      default: 0,
    },

    finalAIScore: {
      type: Number,
      default: 0,
    },

    // revision support if needed
    version: {
      type: Number,
      default: 1,
    },

    isAccepted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

solutionSchema.set("toJSON", { virtuals: true });
solutionSchema.set("toObject", { virtuals: true });

solutionSchema.virtual("problemDetails", {
  ref: "Problem",
  localField: "problem",
  foreignField: "problemId",
  justOne: true,
});

solutionSchema.virtual("solverDetails", {
  ref: "User",
  localField: "solvedBy",
  foreignField: "userId",
  justOne: true,
});

const Solution = mongoose.model("Solution", solutionSchema);

export default Solution;
