// src/utils/normalize.js
const crypto = require("crypto");

// Keep it simple: trim + lowercase; extend to fold accents if needed.
function normalizeAnswer(s) {
  return (s || "").trim().toLowerCase();
}

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

module.exports = { normalizeAnswer, sha256 };
