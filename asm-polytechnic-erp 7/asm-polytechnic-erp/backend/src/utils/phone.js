const { fn, col, where, Op } = require("sequelize");

// Reduces any phone input ("+91 98765-43210", "098765 43210", "9876543210")
// to its digits. Matching is done on the LAST 10 digits so the same number
// is recognised regardless of country-code/zero-prefix/spacing differences,
// both for existing rows and new input.
function normalizePhone(raw) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  return digits;
}

// A Sequelize `where` that matches users.phone against the given number,
// ignoring formatting. Combine with others via [Op.and].
function phoneMatch(raw) {
  const tail = normalizePhone(raw).slice(-10);
  return where(fn("regexp_replace", col("phone"), "\\D", "", "g"), { [Op.like]: `%${tail}` });
}

module.exports = { normalizePhone, phoneMatch };
