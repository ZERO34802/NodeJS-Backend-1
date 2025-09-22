const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;
const signJwt = (payload, expiresIn = process.env.JWT_EXPIRES_IN || "1h") =>
  jwt.sign(payload, secret, { expiresIn });
const verifyJwt = (token) => jwt.verify(token, secret);
module.exports = { signJwt, verifyJwt };
