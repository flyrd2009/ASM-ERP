const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { loginLimiter, otpLimiter, passwordResetLimiter } = require("../middleware/rateLimiters");
const {
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateOtpLoginRequest,
  validateOtpLoginVerify,
  validateChangePassword,
} = require("../middleware/validators");

// Public — password login
router.post("/login", loginLimiter, validateLogin, authController.login);

// Public — passwordless OTP login (email or mobile), an alternative to
// password login rather than a mandatory second factor on top of it
router.post("/otp-login/request", otpLimiter, validateOtpLoginRequest, authController.requestOtpLogin);
router.post("/otp-login/verify", otpLimiter, validateOtpLoginVerify, authController.verifyOtpLogin);

router.post("/refresh", authController.refresh);
router.post("/forgot-password", passwordResetLimiter, validateForgotPassword, authController.requestPasswordReset);
router.post("/reset-password", passwordResetLimiter, validateResetPassword, authController.resetPassword);

// Authenticated
router.post("/logout", authController.logout);
router.post("/logout-all", requireAuth, authController.logoutAll);
router.get("/sessions", requireAuth, authController.listSessions);
router.delete("/sessions/:sessionId", requireAuth, authController.revokeSession);
router.post("/change-password", requireAuth, passwordResetLimiter, validateChangePassword, authController.changePassword);

module.exports = router;
