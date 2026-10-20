const bcrypt = require("bcryptjs");

async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plain, salt);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// Enforced on the client too, but never trust the client alone.
function isStrongPassword(password) {
  const rules = [
    { test: /.{8,}/, msg: "at least 8 characters" },
    { test: /[a-z]/, msg: "a lowercase letter" },
    { test: /[A-Z]/, msg: "an uppercase letter" },
    { test: /[0-9]/, msg: "a number" },
    { test: /[^A-Za-z0-9]/, msg: "a special character" },
  ];
  const failed = rules.filter((r) => !r.test.test(password)).map((r) => r.msg);
  return { valid: failed.length === 0, missing: failed };
}

// Generates a random password that satisfies isStrongPassword by construction —
// used for admin-created accounts, which the user must change on first login anyway.
function generateTempPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*";
  const pick = (set) => set[Math.floor(Math.random() * set.length)];
  const all = upper + lower + digits + special;

  let pwd = pick(upper) + pick(lower) + pick(digits) + pick(special);
  for (let i = 0; i < 8; i++) pwd += pick(all);
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

module.exports = { hashPassword, comparePassword, isStrongPassword, generateTempPassword };
