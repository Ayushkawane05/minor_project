import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6
    },

    userId: {
      type: String,
      unique: true,
      required: true,
    },

    role: {
      type: String,
      enum: ["Employee", "HR", "Admin"],
      default: "Employee",
    },

    department: {
      type: String,
    },

    profileImage: {
      type: String,
    },

    // problemsRaised: [
    //   {
    //     type: String, // Stores problemId
    //   },
    // ],

    // problemsSolved: [
    //   {
    //     type: String, // Stores problemId
    //   },
    // ],

    totalPoints: {
      type: Number,
      default: 0,
    },

    averageRating: {
      type: Number,
      default: 0,
    },

    aiScore: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

userSchema.virtual("raisedProblems", {
  ref: "Problem",
  localField: "problemsRaised",
  foreignField: "problemId",
});

userSchema.virtual("solvedProblems", {
  ref: "Problem",
  localField: "problemsSolved",
  foreignField: "problemId",
});


// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

});





const User = mongoose.model("User", userSchema);

export default User;
