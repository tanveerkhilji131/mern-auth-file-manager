const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"]
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      select: false
    },

    resetPasswordToken: {
      type: String,
      select: false,
      default: null
    },

    resetPasswordExpires: {
      type: Date,
      select: false,
      default: null
    },

    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;