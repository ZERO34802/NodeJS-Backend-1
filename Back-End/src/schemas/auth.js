const { z } = require("zod");
const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(32),
  password: z.string().min(8),
});
const loginSchema = z.object({ username: z.string(), password: z.string() });
const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({
  userId: z.string(),
  token: z.string(),
  newPassword: z.string().min(8),
});
module.exports = { registerSchema, loginSchema, forgotSchema, resetSchema };
