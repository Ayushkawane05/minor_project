import mongoose from "mongoose";

const solutionSchema = new mongoose.Schema(
  {
    // which problem this solution belongs to
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },

    // Who solved it
    solvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

const Solution = mongoose.model("Solution", solutionSchema);

export default Solution;
