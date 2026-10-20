const {
  User,
  Session,
  SecuritySetting,
  ROLES,
  sequelize,
  OtpVerification,
  PasswordHistory,
  LoginAttempt,
  Student,
  StudentDocument,
  CertificateRequest,
  AttendanceRecord,
} = require("../models");
const { sendMail, otpEmailTemplate } = require("../utils/mailer");
const { hashPassword, generateTempPassword } = require("../utils/password");
const { phoneMatch } = require("../utils/phone");

// Admin creates a new account (student, faculty, parent, accounts, or
// another admin). Used for onboarding — e.g. after enrolling a student via
// the SIS module, or adding a staff member. Always starts with a random
// temp password and forcePasswordReset=true, same as the seed admin does,
// so nobody's real password ever passes through the admin's hands.
async function createUser(req, res) {
  const { loginId, email, fullName, role, phone, studentProfile } = req.body;

  if (!loginId || !email || !fullName || !role) {
    return res.status(400).json({ error: "loginId, email, fullName, and role are required." });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${ROLES.join(", ")}` });
  }

  // If a student profile was included, validate it up front — before
  // creating anything — so a bad academic field never leaves behind a
  // login account with no profile attached to it.
  if (role === "student" && studentProfile) {
    const { enrollmentNo, branch, batchYear } = studentProfile;
    if (!enrollmentNo || !branch || !batchYear) {
      return res.status(400).json({ error: "Enrollment number, branch, and batch year are required for a student profile." });
    }
    const year = Number(batchYear);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ error: "Enter a valid batch year." });
    }
    const existingEnrollment = await Student.findOne({ where: { enrollmentNo } });
    if (existingEnrollment) {
      return res.status(409).json({ error: "That enrollment number is already in use." });
    }
  }

  const { Op } = require("sequelize");
  const existing = await User.findOne({ where: { [Op.or]: [{ loginId }, { email }] } });
  if (existing) {
    return res.status(409).json({ error: "A user with that Login ID or email already exists." });
  }
  if (phone && (await User.findOne({ where: phoneMatch(phone) }))) {
    return res.status(409).json({ error: "That mobile number is already registered to another account." });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  // Single transaction: if the profile fails to create, the login account
  // is rolled back too — no more half-created "account with no profile"
  // accounts that used to require hunting down a UUID to fix afterward.
  const user = await sequelize.transaction(async (t) => {
    const newUser = await User.create(
      {
        loginId,
        email,
        fullName,
        phone: phone || null,
        role,
        passwordHash,
        status: "active",
        forcePasswordReset: true,
      },
      { transaction: t }
    );

    if (role === "student" && studentProfile) {
      await Student.create(
        {
          userId: newUser.id,
          enrollmentNo: studentProfile.enrollmentNo,
          branch: studentProfile.branch,
          batchYear: Number(studentProfile.batchYear),
          currentSemester: studentProfile.currentSemester ? Number(studentProfile.currentSemester) : 1,
        },
        { transaction: t }
      );
    }

    return newUser;
  });

  sendMail({
    to: user.email,
    subject: "Your ASM Polytechnic ERP account",
    html: otpEmailTemplate(tempPassword, "account_created"),
  }).catch(() => {});

  const profileCreated = role === "student" && Boolean(studentProfile);
  return res.status(201).json({
    message: `Account created for ${user.fullName}${profileCreated ? " with student profile" : ""}. Temporary credentials were emailed to them.`,
    user: { id: user.id, loginId: user.loginId, email: user.email, fullName: user.fullName, role: user.role },
    // Returned once so the admin can hand it over directly if email delivery
    // is still being set up (e.g. during local testing) — never stored or logged elsewhere.
    tempPassword,
  });
}

// Admin corrects account identity fields — for fixing a typo made at
// creation (wrong spelling of a name, a mistyped email or Login ID).
// Deliberately does NOT allow changing role, password, or status — those
// each have their own dedicated, more careful flow (reset-password, unlock,
// enable/disable) since they carry different security implications.
async function updateUser(req, res) {
  const { userId } = req.params;
  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ error: "User not found." });

  const { loginId, email, fullName, phone } = req.body;
  const { Op } = require("sequelize");

  if (loginId !== undefined && loginId !== user.loginId) {
    const existing = await User.findOne({ where: { loginId, id: { [Op.ne]: userId } } });
    if (existing) return res.status(409).json({ error: "That Login ID is already in use." });
  }
  if (email !== undefined && email.toLowerCase() !== user.email) {
    const existing = await User.findOne({ where: { email: email.toLowerCase(), id: { [Op.ne]: userId } } });
    if (existing) return res.status(409).json({ error: "That email is already in use." });
  }

  if (phone) {
    const phoneTaken = await User.findOne({ where: { [Op.and]: [phoneMatch(phone), { id: { [Op.ne]: userId } }] } });
    if (phoneTaken) return res.status(409).json({ error: "That mobile number is already registered to another account." });
  }

  if (loginId !== undefined) user.loginId = loginId;
  if (email !== undefined) user.email = email.toLowerCase();
  if (fullName !== undefined) user.fullName = fullName;
  if (phone !== undefined) user.phone = phone || null;
  await user.save();

  return res.status(200).json({
    message: `${user.fullName}'s account details updated.`,
    user: { id: user.id, loginId: user.loginId, email: user.email, fullName: user.fullName, phone: user.phone, role: user.role },
  });
}

// Admin unlocks a locked/disabled account.
// Per spec: unlocking does NOT just re-enable login — it forces a password
// reset before the user can reach their dashboard again, and immediately
// invalidates the old password. (Fix: a prior version only set a flag and
// emailed an unused OTP, which meant the OLD password could still log in —
// this issues a real temp password so the old one stops working immediately,
// same as createUser does for a brand-new account.)
async function unlockUser(req, res) {
  const { userId } = req.params;
  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ error: "User not found." });

  const settings = await SecuritySetting.findByPk(user.role);
  const forceReset = settings ? settings.forcePasswordResetOnUnlock : true;

  const tempPassword = generateTempPassword();
  user.passwordHash = await hashPassword(tempPassword);
  user.status = "active";
  user.lockedUntil = null;
  user.failedAttempts = 0;
  user.forcePasswordReset = forceReset;
  await user.save();

  // Revoke any lingering sessions so old refresh tokens can't keep working anywhere
  await Session.update({ isActive: false }, { where: { userId: user.id } });

  sendMail({
    to: user.email,
    subject: "Your ASM ERP account has been unlocked",
    html: otpEmailTemplate(tempPassword, "account_unlocked"),
  }).catch(() => {});

  return res.status(200).json({
    message: `${user.fullName}'s account has been unlocked. Their old password no longer works — a temporary one was emailed to them.`,
    tempPassword,
  });
}

// Admin can also disable/re-enable an account outright (e.g. student left college)
async function setUserStatus(req, res) {
  const { userId } = req.params;
  const { status } = req.body; // "active" | "disabled"
  if (!["active", "disabled"].includes(status)) {
    return res.status(400).json({ error: "Status must be 'active' or 'disabled'." });
  }
  if (status === "disabled" && userId === req.user.sub) {
    return res.status(400).json({ error: "You cannot disable your own account." });
  }
  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ error: "User not found." });

  user.status = status;
  await user.save();

  if (status === "disabled") {
    await Session.update({ isActive: false }, { where: { userId: user.id } });
  }

  return res.status(200).json({ message: `Account ${status === "active" ? "enabled" : "disabled"}.` });
}

// Permanently deletes an account and everything that depends on it. Runs in
// a transaction so a failure partway through can't leave the account
// half-deleted (e.g. a student's academic records gone but the login still
// there, or vice versa).
async function deleteUser(req, res) {
  const { userId } = req.params;

  if (userId === req.user.sub) {
    return res.status(400).json({ error: "You cannot delete your own account." });
  }

  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ error: "User not found." });

  const deletedName = user.fullName;

  await sequelize.transaction(async (t) => {
    // If this account has a student profile, its academic records go with
    // it — attendance, documents, certificate requests all belong to the
    // profile, not the login, so they're meaningless once it's gone.
    const student = await Student.findOne({ where: { userId }, transaction: t });
    if (student) {
      await AttendanceRecord.destroy({ where: { studentId: student.id }, transaction: t });
      await StudentDocument.destroy({ where: { studentId: student.id }, transaction: t });
      await CertificateRequest.destroy({ where: { studentId: student.id }, transaction: t });
      await student.destroy({ transaction: t });
    }

    // Operational/security records tied to active sessions — no value once
    // the account can't log in anymore.
    await Session.destroy({ where: { userId }, transaction: t });
    await OtpVerification.destroy({ where: { userId }, transaction: t });
    await PasswordHistory.destroy({ where: { userId }, transaction: t });

    // Login audit history is kept, not deleted — it's evidence of what
    // happened, independent of whether the account still exists. userId is
    // nullable on this table specifically so it can outlive the account.
    await LoginAttempt.update({ userId: null }, { where: { userId }, transaction: t });

    await user.destroy({ transaction: t });
  });

  return res.status(200).json({ message: `${deletedName}'s account has been permanently deleted.` });
}

// Admin resets a user's password directly (help-desk scenario — user forgot
// their password and can't complete the self-service OTP flow themselves).
async function adminResetPassword(req, res) {
  const { userId } = req.params;
  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ error: "User not found." });

  const tempPassword = generateTempPassword();
  user.passwordHash = await hashPassword(tempPassword);
  user.forcePasswordReset = true;
  await user.save();
  await Session.update({ isActive: false }, { where: { userId: user.id } });

  sendMail({
    to: user.email,
    subject: "Your ASM ERP password was reset",
    html: otpEmailTemplate(tempPassword, "account_unlocked"),
  }).catch(() => {});

  return res.status(200).json({
    message: "Password reset. A temporary password was emailed to the user; they'll be required to set a new one at login.",
    tempPassword,
  });
}

// List users with basic filters — Admin > User Management screen
async function listUsers(req, res) {
  const { role, status, search } = req.query;
  const where = {};
  if (role) where.role = role;
  if (status) where.status = status;

  const { Op } = require("sequelize");
  if (search) {
    where[Op.or] = [
      { fullName: { [Op.iLike]: `%${search}%` } },
      { loginId: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const users = await User.findAll({
    where,
    attributes: { exclude: ["passwordHash"] },
    order: [["fullName", "ASC"]],
    limit: 100,
  });
  return res.status(200).json({ users });
}

// Settings -> Security panel: get/update per-role policy
async function getSecuritySettings(req, res) {
  const rows = await SecuritySetting.findAll();
  const existingRoles = rows.map((r) => r.role);
  const missing = ROLES.filter((r) => !existingRoles.includes(r));
  for (const role of missing) {
    rows.push(await SecuritySetting.create({ role }));
  }
  return res.status(200).json({ settings: rows });
}

async function updateSecuritySettings(req, res) {
  const { role } = req.params;
  if (!ROLES.includes(role)) return res.status(400).json({ error: "Unknown role." });

  const bounds = {
    sessionTimeoutMinutes: [5, 180],
    maxFailedAttempts: [3, 20],
    lockoutMinutes: [1, 1440],
  };
  const booleanFields = ["forcePasswordResetOnUnlock", "singleSessionEnforced"];

  const updates = {};
  for (const [key, [min, max]] of Object.entries(bounds)) {
    if (req.body[key] === undefined) continue;
    const val = Number(req.body[key]);
    if (!Number.isInteger(val) || val < min || val > max) {
      return res.status(400).json({ error: `${key} must be an integer between ${min} and ${max}.` });
    }
    updates[key] = val;
  }
  for (const key of booleanFields) {
    if (req.body[key] !== undefined) updates[key] = !!req.body[key];
  }

  let setting = await SecuritySetting.findByPk(role);
  if (!setting) setting = await SecuritySetting.create({ role });
  await setting.update(updates);

  return res.status(200).json({ message: `Security settings updated for ${role}.`, setting });
}

module.exports = {
  createUser,
  updateUser,
  unlockUser,
  setUserStatus,
  deleteUser,
  adminResetPassword,
  listUsers,
  getSecuritySettings,
  updateSecuritySettings,
};
