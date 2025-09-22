// Back-End/src/services/authService.js
const { prisma } = require("../lib/prisma");
const { hashPassword, comparePassword } = require("../utils/hash");
const crypto = require("crypto");
const { transporter } = require("../lib/mailer");
const { signJwt } = require("../lib/jwt");

const RESET_EXP_MINUTES = 15;

// Small helper to prevent indefinite hangs
const withTimeout = (p, ms = 15000) =>
  Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);

async function registerUser({ email, username, password }) {
  // Ensure email and username are unique in Prisma schema for reliable lookups
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) throw new Error("User already exists");

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { email, username, passwordHash },
  });

  const token = signJwt({ sub: user.id, username: user.username });

  return {
    user: { id: user.id, email: user.email, username: user.username },
    token,
  };
}

async function loginUser({ username, password }) {
  // username should be @unique if using findUnique; otherwise use findFirst
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new Error("Invalid credentials");

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) throw new Error("Invalid credentials");

  const token = signJwt({ sub: user.id, username: user.username });

  return {
    user: { id: user.id, email: user.email, username: user.username },
    token,
  };
}

async function requestPasswordReset({ email }) {
  console.log("SVC requestPasswordReset start", email);

  // email must be @unique for findUnique to be reliable
  const user = await prisma.user.findUnique({ where: { email } });

  // Do not reveal whether email exists to avoid enumeration
  if (!user) {
    console.log("SVC requestPasswordReset no-user");
    return;
  }

  // Generate raw token and store only its hash
  const rawToken = crypto.randomBytes(32).toString("hex"); // 256-bit token [web:787][web:789]
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + RESET_EXP_MINUTES * 60 * 1000);

  // Invalidate previous tokens for this user (optional hardening)
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, used: false },
  });

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt, used: false },
  });

  // Build frontend link (points to the Vercel page)
  const link = `${process.env.APP_URL}/reset-password.html?userId=${user.id}&token=${rawToken}`;

  // Send the email with a timeout and proper await/catch
  console.log("SVC sending email");
  await withTimeout(
    transporter.sendMail({
      to: user.email,
      from: process.env.MAIL_FROM,
      subject: "Password reset",
      text: `Reset link (expires in ${RESET_EXP_MINUTES} minutes): ${link}`,
      html: `<p>Reset link (expires in ${RESET_EXP_MINUTES} minutes): <a href="${link}">${link}</a></p>`,
    })
  ).catch((err) => {
    console.error("SVC mail error", err);
    // Do not throw to client; finish silently to avoid revealing state
  });

  console.log("SVC requestPasswordReset done");
  return; // ensure the route can send response immediately after calling this
}

async function resetPassword({ userId, token, newPassword }) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const record = await prisma.passwordResetToken.findFirst({
    where: {
      userId,
      tokenHash,
      used: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) throw new Error("Invalid or expired token");

  const newHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { used: true },
    }),
  ]);
}

module.exports = {
  registerUser,
  loginUser,
  requestPasswordReset,
  resetPassword,
};
