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

const withTimeout = (p, ms = 15000) =>
  Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);

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
router.post("/forgot-password", async (req, res) => {
  try {
    // Some browsers/clients send { email } or raw string; normalize defensively
    const body = req.body ?? {};
    const email =
      typeof body === "string"
        ? body
        : typeof body.email === "string"
        ? body.email.trim()
        : "";

    if (!email) return res.status(400).json({ message: "Email required" });

    console.log("FORGOT start", email);
    await requestPasswordReset({ email }); // pass as object with email key
    console.log("FORGOT done", email);

    return res
      .status(200)
      .json({ message: "If the email exists, a reset link was sent" });
  } catch (err) {
    console.error("FORGOT error", err);
    return res.status(500).json({ message: "Server error" });
  }
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
