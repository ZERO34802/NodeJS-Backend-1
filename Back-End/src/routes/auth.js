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
const { prisma } = require("../lib/prisma");
const { normalizeAnswer, sha256 } = require("../utils/normalize");

const router = express.Router();

const withTimeout = (p, ms = 15000) =>
  Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);

router.post("/forgot-password/start", async (req, res) => {
  try {
    const { usernameOrEmail } = req.body || {};
    if (!usernameOrEmail)
      return res.status(400).json({ message: "Missing identifier" });

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: usernameOrEmail }, { username: usernameOrEmail }],
      },
      select: { id: true, securityQuestionKey: true },
    });

    // Always respond ok; include question only if user exists (avoid enumeration)
    return res
      .status(200)
      .json({ ok: true, questionKey: user ? user.securityQuestionKey : null });
  } catch (e) {
    console.error("forgot-start error", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/forgot-password/verify
// Body: { usernameOrEmail, answer, newPassword }
router.post("/forgot-password/verify", async (req, res) => {
  try {
    const { usernameOrEmail, answer, newPassword } = req.body || {};
    if (!usernameOrEmail || !answer || !newPassword) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: usernameOrEmail }, { username: usernameOrEmail }],
      },
    });
    if (!user) return res.status(400).json({ message: "Invalid answer" });

    const ok = sha256(normalizeAnswer(answer)) === user.securityAnswerHash;
    if (!ok) return res.status(400).json({ message: "Invalid answer" });

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return res.status(200).json({ message: "Password updated" });
  } catch (e) {
    console.error("forgot-verify error", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/register
// src/routes/auth.js (within existing register route)
router.post("/register", async (req, res) => {
  try {
    const { email, username, password, securityQuestionKey, securityAnswer } =
      req.body || {};
    if (
      !email ||
      !username ||
      !password ||
      !securityQuestionKey ||
      !securityAnswer
    ) {
      return res.status(400).json({ message: "Missing fields" });
    }
    const { registerUser } = require("../services/authService");
    const result = await registerUser({
      email,
      username,
      password,
      securityQuestionKey,
      securityAnswer,
    });
    return res.status(201).json(result);
  } catch (e) {
    console.error("register error", e);
    return res.status(400).json({ message: e.message || "Signup failed" });
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
