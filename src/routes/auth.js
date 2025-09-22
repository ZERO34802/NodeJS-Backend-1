const express = require("express");
const { validate } = require("../middlewares/validate");
const {
  registerSchema,
  loginSchema,
  forgotSchema,
  resetSchema,
} = require("../schemas/auth");
const {
  registerUser,
  loginUser,
  requestPasswordReset,
  resetPassword,
} = require("../services/authService");

const router = express.Router();

// POST /api/auth/register
router.post("/register", validate(registerSchema), async (req, res) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (e) {
    const msg = e.message || "Error";
    const code = msg.includes("exists") ? 400 : 500;
    res.status(code).json({ message: msg });
  }
});

// POST /api/auth/login
router.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const result = await loginUser(req.body);
    res.json(result);
  } catch {
    res.status(400).json({ message: "Invalid credentials" });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", validate(forgotSchema), async (req, res) => {
  // Intentionally generic message to avoid user enumeration
  await requestPasswordReset(req.body);
  res.json({ message: "If that email exists, a reset link has been sent" });
});

// POST /api/auth/reset-password
router.post("/reset-password", validate(resetSchema), async (req, res) => {
  try {
    await resetPassword(req.body);
    res.json({ message: "Password reset successful" });
  } catch (e) {
    res.status(400).json({ message: e.message || "Invalid or expired token" });
  }
});

module.exports = router;
