const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");
const {
  sendPasswordResetEmail
} = require("../config/mailer");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RESET_TOKEN_EXPIRY_MINUTES = 15;

const getSafeUser = (user) => {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
};

const createToken = (userId) => {
  return jwt.sign(
    {
      userId: userId.toString()
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d"
    }
  );
};

const cookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000
  };
};

const hashResetToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required."
      });
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      return res.status(400).json({
        message: "Name must be at least 2 characters."
      });
    }

    if (trimmedName.length > 50) {
      return res.status(400).json({
        message: "Name cannot exceed 50 characters."
      });
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters."
      });
    }

    if (Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        message: "Password is too long."
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      password: hashedPassword
    });

    return res.status(201).json({
      message: "Signup successful. Please login.",
      user: getSafeUser(user)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    console.error("Signup error:", error);

    return res.status(500).json({
      message: "Something went wrong while creating your account."
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address."
      });
    }

    const user = await User.findOne({
      email: normalizedEmail
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const token = createToken(user._id);

    res.cookie(
      "token",
      token,
      cookieOptions()
    );

    return res.status(200).json({
      message: "Login successful.",
      user: getSafeUser(user)
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Something went wrong while logging in."
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(
      req.user.userId
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    return res.status(200).json({
      user: getSafeUser(user)
    });
  } catch (error) {
    console.error(
      "Get current user error:",
      error
    );

    return res.status(500).json({
      message:
        "Something went wrong while fetching your account."
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required."
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address."
      });
    }

    const genericMessage =
      "If an account with that email exists, a password reset link has been sent.";

    const user = await User.findOne({
      email: normalizedEmail
    });

    /*
     * Do not reveal whether the email exists.
     * The same success message is returned for
     * both existing and non-existing accounts.
     */
    if (!user) {
      return res.status(200).json({
        message: genericMessage
      });
    }

    /*
     * Generate a cryptographically secure random token.
     * This raw token is sent only through the email.
     */
    const rawResetToken =
      crypto.randomBytes(32).toString("hex");

    /*
     * Only the hash is stored in MongoDB.
     */
    const hashedResetToken =
      hashResetToken(rawResetToken);

    const resetExpires = new Date(
      Date.now() +
        RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000
    );

    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpires = resetExpires;

    await user.save();

    const clientUrl =
      process.env.CLIENT_URL;

    if (!clientUrl) {
      console.error(
        "CLIENT_URL is not configured."
      );

      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;

      await user.save();

      return res.status(500).json({
        message:
          "Unable to process the password reset request."
      });
    }

    const resetUrl =
      `${clientUrl}/reset-password/${rawResetToken}`;

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl
      });
    } catch (emailError) {
      console.error(
        "Password reset email error:",
        emailError
      );

      /*
       * Do not leave a valid reset token in the database
       * when the reset email could not be sent.
       */
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;

      await user.save();

      return res.status(500).json({
        message:
          "Unable to send the password reset email. Please try again later."
      });
    }

    return res.status(200).json({
      message: genericMessage
    });
  } catch (error) {
    console.error(
      "Forgot password error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to process the password reset request."
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } =
      req.body;

    if (!token) {
      return res.status(400).json({
        message: "Reset token is required."
      });
    }

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({
        message: "Invalid or expired reset link."
      });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({
        message:
          "Password and confirm password are required."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters."
      });
    }

    if (Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        message: "Password is too long."
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match."
      });
    }

    const hashedResetToken =
      hashResetToken(token);

    /*
     * Hash the new password before the DB update.
     */
    const hashedPassword =
      await bcrypt.hash(password, 12);

    /*
     * Atomic update:
     * - token must match
     * - token must not be expired
     * - reset fields are removed during the same update
     *
     * This makes the token one-time-use even if two requests
     * arrive at almost the same time.
     */
    const updatedUser =
      await User.findOneAndUpdate(
        {
          resetPasswordToken: hashedResetToken,
          resetPasswordExpires: {
            $gt: new Date()
          }
        },
        {
          $set: {
            password: hashedPassword
          },
          $unset: {
            resetPasswordToken: 1,
            resetPasswordExpires: 1
          }
        },
        {
          new: true
        }
      );

    if (!updatedUser) {
      return res.status(400).json({
        message: "Invalid or expired reset link."
      });
    }

    return res.status(200).json({
      message: "Password reset successfully."
    });
  } catch (error) {
    console.error(
      "Reset password error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to reset the password. Please try again."
    });
  }
};

module.exports = {
  signup,
  login,
  getCurrentUser,
  forgotPassword,
  resetPassword
};