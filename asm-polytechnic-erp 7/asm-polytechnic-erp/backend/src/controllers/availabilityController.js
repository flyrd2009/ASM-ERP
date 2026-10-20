const { Op } = require("sequelize");
const { User, Student } = require("../models");
const { phoneMatch } = require("../utils/phone");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// "Is this already taken?" — used by the admin/faculty forms to flag a
// duplicate email, Login ID, mobile number, or enrollment number while it's
// being typed, instead of only failing after Submit.
//
// Restricted to signed-in staff on purpose: exposing this publicly would
// let anyone enumerate which emails/numbers have accounts. Faculty may only
// check enrollment numbers; email/Login ID/phone checks are admin-only.
async function checkAvailability(req, res) {
  const { field, value, excludeUserId, excludeStudentId } = req.query;
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return res.status(400).json({ error: "A value to check is required." });

  let count;
  if (field === "enrollmentNo") {
    const where = { enrollmentNo: v };
    if (excludeStudentId && UUID_RE.test(excludeStudentId)) where.id = { [Op.ne]: excludeStudentId };
    count = await Student.count({ where });
  } else if (["email", "loginId", "phone"].includes(field)) {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Only admins can check this field." });

    const conditions = [];
    if (field === "email") conditions.push({ email: v.toLowerCase() });
    else if (field === "loginId") conditions.push({ loginId: v });
    else {
      if (v.replace(/\D/g, "").length < 7) return res.status(400).json({ error: "Enter a valid mobile number." });
      conditions.push(phoneMatch(v));
    }
    if (excludeUserId && UUID_RE.test(excludeUserId)) conditions.push({ id: { [Op.ne]: excludeUserId } });

    count = await User.count({ where: { [Op.and]: conditions } });
  } else {
    return res.status(400).json({ error: "Unsupported field." });
  }

  return res.status(200).json({ available: count === 0 });
}

module.exports = { checkAvailability };
