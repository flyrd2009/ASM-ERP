const { User, Session, SecuritySetting, LoginAttempt, OtpVerification, PasswordHistory } = require("../models");
const { comparePassword, hashPassword, isStrongPassword } = require("../utils/password");
const { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } = require("../utils/token");
const { generateOtp, hashOtp, compareOtp } = require("../utils/otp");
const { sendMail, otpEmailTemplate, newDeviceAlertTemplate } = require("../utils/mailer");
const { sendWhatsAppMessage, otpWhatsAppMessage } = require("../utils/whatsapp");
const { Op } = require("sequelize");
const { phoneMatch } = require("../utils/phone");

const REFRESH_COOKIE = "refreshToken";
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
const OTP_TTL_MS = 15 * 60 * 1000;

async function getSecurityForRole(role) {
  let setting = await SecuritySetting.findByPk(role);
  if (!setting) {
    setting = await SecuritySetting.create({ role });
  }
  return setting;
}

// Sends the OTP required to complete a forced password reset (first login,
// or after an admin unlock/reset). Previously a forced reset only asked for
// a new password — someone who obtained the temp password through any
// leaked channel (a screenshot, a shared chat) could set the real password
// themselves. Requiring an emailed code here means completing the reset
// also requires access to the account's actual inbox, not just the temp
// password. Failure is logged, never thrown — email hiccups shouldn't block
// login from reaching the reset screen.
async function sendForcedResetOtp(user) {
  const otp = generateOtp();
  await OtpVerification.create({
    userId: user.id,
    otpHash: await hashOtp(otp),
    purpose: "password_reset",
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
  // Fire-and-forget: the OTP is already saved and usable the moment this
  // returns. Not awaiting the send means a slow/unreachable SMTP server
  // (which can hang for a minute or more before timing out) never delays
  // the actual HTTP response — the email arrives whenever it arrives.
  sendMail({
    to: user.email,
    subject: "Complete your ASM ERP password reset",
    html: otpEmailTemplate(otp, "password_reset"),
  }).catch((err) => {
    console.error("Failed to send forced-reset OTP email:", err.message);
  });
}

// Delivers an OTP via whichever channel was requested. Never throws — a
// broken email/WhatsApp provider should degrade gracefully, not crash the
// request or (worse) turn into a way to tell real accounts from fake ones
// by which requests 500 vs succeed. Also never awaited by callers — see
// the fire-and-forget note above; the same reasoning applies here.
function deliverOtp({ user, channel, otp, purpose, emailSubject }) {
  if (channel === "mobile") {
    if (!user.phone) return { delivered: false, reason: "no_phone_on_file" };
    sendWhatsAppMessage(user.phone, otpWhatsAppMessage(otp, purpose)).catch((err) => {
      console.error("Failed to send OTP via WhatsApp:", err.message);
    });
    return { delivered: true };
  }

  sendMail({ to: user.email, subject: emailSubject, html: otpEmailTemplate(otp, purpose) }).catch((err) => {
    console.error("Failed to send OTP email:", err.message);
  });
  return { delivered: true };
}

// Login with identifier (email / enrollment no. / employee ID) + password.
// No forced second factor after this anymore — if the password's right and
// the account isn't locked/disabled, the session is issued immediately.
// (Passwordless OTP login is available as a separate, alternative method —
// see requestOtpLogin/verifyOtpLogin below — rather than a mandatory extra
// step bolted onto every password login.)
async function login(req, res) {
  const { identifier, password } = req.body;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"] || "unknown";

  if (!identifier || !password) {
    return res.status(400).json({ error: "Email/enrollment number and password are required." });
  }

  
  
  const [dbCheck] = await User.sequelize.query(`
  SELECT
    current_database() AS db,
    current_schema() AS schema,
    current_schemas(true) AS search_path,
    to_regclass('users') AS resolved_users,
    to_regclass('public.users') AS public_users,
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'photo_url'
    ) AS photo_url_exists
`);

console.log("Login DB diagnostic:", dbCheck);
  
  
  const user = await User.findOne({
    where: { [Op.or]: [{ loginId: identifier }, { email: identifier.toLowerCase() }] },
  });

  if (!user) {
    await LoginAttempt.create({ loginIdAttempted: identifier, success: false, reason: "no_such_user", ip, userAgent });
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const loginId = user.loginId;
  const settings = await getSecurityForRole(user.role);

  if (user.status === "locked" && user.lockedUntil && user.lockedUntil > new Date()) {
    await LoginAttempt.create({ userId: user.id, loginIdAttempted: loginId, success: false, reason: "locked", ip, userAgent });
    return res.status(423).json({
      error: "Account locked due to too many failed attempts. Contact your administrator or try again later.",
      lockedUntil: user.lockedUntil,
    });
  }

  if (user.status === "disabled") {
    await LoginAttempt.create({ userId: user.id, loginIdAttempted: loginId, success: false, reason: "disabled", ip, userAgent });
    return res.status(403).json({ error: "This account has been disabled. Contact the admin office." });
  }

  const passwordOk = await comparePassword(password, user.passwordHash);

  if (!passwordOk) {
    user.failedAttempts += 1;

    if (user.failedAttempts >= settings.maxFailedAttempts) {
      user.status = "locked";
      user.lockedUntil = new Date(Date.now() + settings.lockoutMinutes * 60 * 1000);
      await user.save();
      await LoginAttempt.create({ userId: user.id, loginIdAttempted: loginId, success: false, reason: "locked_now", ip, userAgent });
      return res.status(423).json({
        error: `Too many failed attempts. Account locked for ${settings.lockoutMinutes} minutes or until an admin unlocks it.`,
        lockedUntil: user.lockedUntil,
      });
    }

    await user.save();
    await LoginAttempt.create({ userId: user.id, loginIdAttempted: loginId, success: false, reason: "bad_password", ip, userAgent });
    return res.status(401).json({
      error: "Invalid credentials.",
      attemptsRemaining: settings.maxFailedAttempts - user.failedAttempts,
    });
  }

  user.failedAttempts = 0;
  await user.save();

  if (user.forcePasswordReset) {
    await LoginAttempt.create({ userId: user.id, loginIdAttempted: loginId, success: false, reason: "force_reset_required", ip, userAgent });
    await sendForcedResetOtp(user);
    return res.status(200).json({
      forcePasswordReset: true,
      userId: user.id,
      message: "Password reset required before you can continue. We've emailed you a code to complete it.",
    });
  }

  return completeLogin(req, res, user, settings);
}

// Request an OTP for passwordless login. channel is "email" or "mobile",
// identifier is the matching email address or phone number. Always returns
// the same response shape whether or not an account was found/deliverable,
// so this can't be used to enumerate valid accounts.
async function requestOtpLogin(req, res) {
  const { identifier, channel } = req.body;
  const generic = { message: "If that account exists, a code has been sent." };

  const where = channel === "mobile" ? phoneMatch(identifier) : { email: identifier.toLowerCase() };
  const user = await User.findOne({ where });
  if (!user) return res.status(200).json(generic);

  if (channel === "mobile" && !user.phone) return res.status(200).json(generic);

  if (user.status === "disabled") return res.status(200).json(generic);
  if (user.status === "locked" && user.lockedUntil && user.lockedUntil > new Date()) {
    return res.status(200).json(generic);
  }

  const otp = generateOtp();
  await OtpVerification.create({
    userId: user.id,
    otpHash: await hashOtp(otp),
    purpose: "otp_login",
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  await deliverOtp({ user, channel, otp, purpose: "otp_login", emailSubject: "Your ASM ERP login code" });

  return res.status(200).json({ ...generic, userId: user.id });
}

// Verify the OTP from requestOtpLogin and, if valid, log the person in —
// this IS the login for this method, not a second factor on top of one.
async function verifyOtpLogin(req, res) {
  const { userId, otp } = req.body;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"] || "unknown";

  const record = await OtpVerification.findOne({
    where: { userId, purpose: "otp_login", consumed: false, expiresAt: { [Op.gt]: new Date() } },
    order: [["createdAt", "DESC"]],
  });

  if (!record || !(await compareOtp(otp, record.otpHash))) {
    return res.status(401).json({ error: "Invalid or expired code." });
  }

  const user = await User.findByPk(userId);
  if (!user) return res.status(401).json({ error: "Invalid or expired code." });

  if (user.status === "disabled") {
    return res.status(403).json({ error: "This account has been disabled. Contact the admin office." });
  }
  if (user.status === "locked" && user.lockedUntil && user.lockedUntil > new Date()) {
    return res.status(423).json({ error: "Account locked. Contact your administrator.", lockedUntil: user.lockedUntil });
  }

  record.consumed = true;
  await record.save();

  if (user.forcePasswordReset) {
    await LoginAttempt.create({ userId: user.id, loginIdAttempted: user.loginId, success: false, reason: "force_reset_required", ip, userAgent });
    await sendForcedResetOtp(user);
    return res.status(200).json({ forcePasswordReset: true, userId: user.id, message: "Password reset required before you can continue. We've emailed you a code to complete it." });
  }

  const settings = await getSecurityForRole(user.role);
  return completeLogin(req, res, user, settings, "otp_login");
}

// Issues tokens, creates session record, enforces single-session policy, sends new-device alert
async function completeLogin(req, res, user, settings, attemptReason = "ok") {
  const ip = req.ip;
  const userAgent = req.headers["user-agent"] || "unknown";

  // These two don't depend on each other's results, so run them together
  // instead of waiting on one full network round-trip before starting the
  // next — on a geographically distant database this is the difference
  // between one round-trip's worth of latency and two.
  const [, priorFromIp] = await Promise.all([
    settings.singleSessionEnforced
      ? Session.update({ isActive: false }, { where: { userId: user.id, isActive: true } })
      : Promise.resolve(),
    Session.findOne({ where: { userId: user.id, ip } }),
  ]);

  if (!priorFromIp) {
    sendMail({
      to: user.email,
      subject: "New login to your ASM ERP account",
      html: newDeviceAlertTemplate({ ip, device: userAgent, time: new Date().toLocaleString() }),
    }).catch(() => {});
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  user.lastLoginAt = new Date();
  user.lastLoginIp = ip;

  // Same reasoning: the session record, the user's last-login timestamp,
  // and the audit log entry are three independent writes — no need to
  // serialize them.
  await Promise.all([
    Session.create({
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      deviceInfo: userAgent,
      ip,
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }),
    user.save(),
    LoginAttempt.create({ userId: user.id, loginIdAttempted: user.loginId, success: true, reason: attemptReason, ip, userAgent }),
  ]);

  res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTS);
  return res.status(200).json({
    accessToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      role: user.role,
      loginId: user.loginId,
      email: user.email,
      photoUrl: user.photoUrl || null,
    },
    sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
  });
}

// Refresh access token using the httpOnly refresh cookie; also drives the
// inactivity check (see middleware/sessionActivity.js for the enforcement side).
async function refresh(req, res) {
  const token = req.cookies[REFRESH_COOKIE];
  if (!token) return res.status(401).json({ error: "No refresh token." });

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }

  const session = await Session.findOne({
    where: { userId: payload.sub, refreshTokenHash: hashToken(token), isActive: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }

  const user = await User.findByPk(payload.sub);
  const settings = await getSecurityForRole(user.role);

  const inactiveMinutes = (Date.now() - new Date(session.lastActivityAt).getTime()) / 60000;
  if (inactiveMinutes > settings.sessionTimeoutMinutes) {
    session.isActive = false;
    await session.save();
    return res.status(401).json({ error: "Session expired due to inactivity." });
  }

  session.lastActivityAt = new Date();
  await session.save();

  const accessToken = signAccessToken(user);
  return res.status(200).json({
    accessToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      role: user.role,
      loginId: user.loginId,
      email: user.email,
      photoUrl: user.photoUrl || null,
    },
    sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
  });
}

async function logout(req, res) {
  const token = req.cookies[REFRESH_COOKIE];
  if (token) {
    await Session.update(
      { isActive: false },
      { where: { refreshTokenHash: hashToken(token) } }
    );
  }
  res.clearCookie(REFRESH_COOKIE, REFRESH_COOKIE_OPTS);
  return res.status(200).json({ message: "Logged out." });
}

async function logoutAll(req, res) {
  await Session.update({ isActive: false }, { where: { userId: req.user.sub } });
  res.clearCookie(REFRESH_COOKIE, REFRESH_COOKIE_OPTS);
  return res.status(200).json({ message: "Logged out from all devices." });
}

async function listSessions(req, res) {
  const sessions = await Session.findAll({
    where: { userId: req.user.sub, isActive: true },
    attributes: ["id", "deviceInfo", "ip", "lastActivityAt", "createdAt"],
    order: [["lastActivityAt", "DESC"]],
  });
  return res.status(200).json({ sessions });
}

async function revokeSession(req, res) {
  const { sessionId } = req.params;
  const session = await Session.findOne({ where: { id: sessionId, userId: req.user.sub } });
  if (!session) return res.status(404).json({ error: "Session not found." });
  session.isActive = false;
  await session.save();
  return res.status(200).json({ message: "Session revoked." });
}

async function resetPassword(req, res) {
  const { userId, newPassword, otp } = req.body;

  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ error: "User not found." });

  if (!otp) {
    return res.status(400).json({ error: "A verification code is required to reset your password." });
  }

  const record = await OtpVerification.findOne({
    where: {
      userId,
      purpose: { [Op.in]: ["password_reset", "admin_unlock_reset"] },
      consumed: false,
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [["createdAt", "DESC"]],
  });
  if (!record || !(await compareOtp(otp, record.otpHash))) {
    return res.status(401).json({ error: "Invalid or expired code." });
  }
  record.consumed = true;
  await record.save();

  const strength = isStrongPassword(newPassword);
  if (!strength.valid) {
    return res.status(400).json({ error: "Password too weak.", missing: strength.missing });
  }

  const history = await PasswordHistory.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
    limit: 5,
  });
  for (const h of history) {
    if (await comparePassword(newPassword, h.passwordHash)) {
      return res.status(400).json({ error: "You cannot reuse a recent password." });
    }
  }

  const newHash = await hashPassword(newPassword);
  await PasswordHistory.create({ userId, passwordHash: newHash });

  user.passwordHash = newHash;
  user.forcePasswordReset = false;
  user.status = "active";
  user.failedAttempts = 0;
  user.lockedUntil = null;
  await user.save();

  await Session.update({ isActive: false }, { where: { userId } });

  return res.status(200).json({ message: "Password updated. Please log in with your new password." });
}

// Forgot password: request an OTP by email OR mobile (delivered via WhatsApp). identifier is the
// matching email/phone for the chosen channel; loginId is also accepted on
// the email channel since that's how the field has always worked.
async function requestPasswordReset(req, res) {
  const { identifier, channel } = req.body;
  const generic = { message: "If that account exists, a reset code has been sent." };

  const where =
    channel === "mobile"
      ? phoneMatch(identifier)
      : { [Op.or]: [{ loginId: identifier }, { email: identifier.toLowerCase() }] };

  const user = await User.findOne({ where });
  if (!user) return res.status(200).json(generic);
  if (channel === "mobile" && !user.phone) return res.status(200).json(generic);

  const otp = generateOtp();
  await OtpVerification.create({
    userId: user.id,
    otpHash: await hashOtp(otp),
    purpose: "password_reset",
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  await deliverOtp({ user, channel, otp, purpose: "password_reset", emailSubject: "Reset your ASM ERP password" });

  return res.status(200).json({ ...generic, userId: user.id });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new password are required." });
  }

  const user = await User.findByPk(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });

  const currentOk = await comparePassword(currentPassword, user.passwordHash);
  if (!currentOk) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }

  const strength = isStrongPassword(newPassword);
  if (!strength.valid) {
    return res.status(400).json({ error: "Password too weak.", missing: strength.missing });
  }

  if (await comparePassword(newPassword, user.passwordHash)) {
    return res.status(400).json({ error: "New password must be different from your current password." });
  }

  const history = await PasswordHistory.findAll({
    where: { userId: user.id },
    order: [["createdAt", "DESC"]],
    limit: 5,
  });
  for (const h of history) {
    if (await comparePassword(newPassword, h.passwordHash)) {
      return res.status(400).json({ error: "You cannot reuse a recent password." });
    }
  }

  const newHash = await hashPassword(newPassword);
  await PasswordHistory.create({ userId: user.id, passwordHash: newHash });

  user.passwordHash = newHash;
  await user.save();

  const currentToken = req.cookies[REFRESH_COOKIE];
  const currentHash = currentToken ? hashToken(currentToken) : null;
  await Session.update(
    { isActive: false },
    {
      where: {
        userId: user.id,
        ...(currentHash ? { refreshTokenHash: { [Op.ne]: currentHash } } : {}),
      },
    }
  );

  return res.status(200).json({ message: "Password changed. You've been kept signed in here; other devices were signed out." });
}

module.exports = {
  changePassword,
  login,
  requestOtpLogin,
  verifyOtpLogin,
  refresh,
  logout,
  logoutAll,
  listSessions,
  revokeSession,
  resetPassword,
  requestPasswordReset,
};
