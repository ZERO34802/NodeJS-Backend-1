const bcrypt = require("bcrypt");
const hashPassword = async (plain) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plain, salt);
};
const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);
module.exports = { hashPassword, comparePassword };
