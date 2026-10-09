const express = require("express");

const {
  signup,
  login,
  getCurrentUser,
  forgotPassword,
  resetPassword
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", signup);

router.post("/login", login);

router.get("/me", protect, getCurrentUser);

router.post(
  "/forgot-password",
  forgotPassword
);

router.post(
  "/reset-password/:token",
  resetPassword
);

module.exports = router;