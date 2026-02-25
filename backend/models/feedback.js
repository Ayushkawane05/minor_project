import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    feedbackId: {
      type: String,
      unique: true,
      required: true,
    },

    problem: {
      type: String, //  problemId
      required: true,
    },

    solution: {
      type: String, //  solutionId
      required: true,
    },

    givenBy: {
      type: String, //  userId
      required: true,
    },

    receivedBy: {
      type: String, //  userId
      required: true,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

    //comment will go to ai
    comment: {
      type: String,
      required: true,
      trim: true,
    },

    // AI analysis result r
    sentimentScore: {
      type: Number,
      default: 0,
    },

    sentimentLabel: {
      type: String,
      enum: ["Positive", "Neutral", "Negative"],
      default: "Neutral",
    },

    // contribution impact score depend on kitne bar contribute kr raa (ai use can add)
    // contributionScore: {
    //   type: Number,
    //   default: 0,
    // },

    isValidatedByAI: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

feedbackSchema.set("toJSON", { virtuals: true });
feedbackSchema.set("toObject", { virtuals: true });

feedbackSchema.virtual("problemDetails", {
  ref: "Problem",
  localField: "problem",
  foreignField: "problemId",
  justOne: true,
});

feedbackSchema.virtual("solutionDetails", {
  ref: "Solution",
  localField: "solution",
  foreignField: "solutionId",
  justOne: true,
});

feedbackSchema.virtual("giverDetails", {
  ref: "User",
  localField: "givenBy",
  foreignField: "userId",
  justOne: true,
});

feedbackSchema.virtual("receiverDetails", {
  ref: "User",
  localField: "receivedBy",
  foreignField: "userId",
  justOne: true,
});

const Feedback = mongoose.model("Feedback", feedbackSchema);

export default Feedback;
