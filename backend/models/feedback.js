import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },

    solution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Solution",
      required: true,
    },

    givenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

    // AI analysis result range define baki hai
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
    contributionScore: {
      type: Number,
      default: 0,
    },

    isValidatedByAI: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Feedback = mongoose.model("Feedback", feedbackSchema);

export default Feedback;
