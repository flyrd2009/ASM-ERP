const { body, validationResult } = require("express-validator");

// Run after any validate*() chain below. Returns a clean 400 instead of
// letting malformed input reach a controller/DB query.
function checkValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

const validateLogin = [
  body("identifier").trim().notEmpty().withMessage("Email or enrollment/employee ID is required.").isLength({ max: 100 }),
  body("password").notEmpty().withMessage("Password is required.").isLength({ max: 200 }),
  checkValidation,
];

const validateForgotPassword = [
  body("channel").optional().isIn(["email", "mobile"]).withMessage("Channel must be email or mobile."),
  body("identifier").trim().notEmpty().withMessage("Enter your email, mobile number, enrollment number, or employee ID.").isLength({ max: 100 }),
  body("identifier").custom((value, { req }) => {
    const channel = req.body.channel || "email";
    if (channel === "mobile" && !/^\+?[0-9]{7,15}$/.test(value)) {
      throw new Error("Enter a valid mobile number.");
    }
    return true;
  }),
  checkValidation,
];

const validateOtpLoginRequest = [
  body("channel").isIn(["email", "mobile"]).withMessage("Channel must be email or mobile."),
  body("identifier").trim().notEmpty().withMessage("Enter your email or mobile number.").isLength({ max: 100 }),
  body("identifier").custom((value, { req }) => {
    if (req.body.channel === "mobile") {
      if (!/^\+?[0-9]{7,15}$/.test(value)) throw new Error("Enter a valid mobile number.");
    } else if (!/^\S+@\S+\.\S+$/.test(value)) {
      throw new Error("Enter a valid email address.");
    }
    return true;
  }),
  checkValidation,
];

const validateOtpLoginVerify = [
  body("userId").trim().notEmpty().withMessage("Missing user reference."),
  body("otp").isLength({ min: 6, max: 6 }).isNumeric().withMessage("Code must be 6 digits."),
  checkValidation,
];

const validateResetPassword = [
  body("userId").trim().notEmpty().withMessage("Missing user reference."),
  body("newPassword").isLength({ min: 8, max: 200 }).withMessage("Password must be at least 8 characters."),
  body("otp").isLength({ min: 6, max: 6 }).isNumeric().withMessage("Enter the 6-digit code sent to your email."),
  checkValidation,
];

const validateCreateUser = [
  body("loginId").trim().notEmpty().isLength({ max: 50 }).matches(/^[a-zA-Z0-9._-]+$/).withMessage("Login ID may only contain letters, numbers, dots, dashes, and underscores."),
  body("email").trim().isEmail().withMessage("A valid email is required.").normalizeEmail(),
  body("fullName").trim().notEmpty().isLength({ max: 100 }).withMessage("Full name is required."),
  body("role").trim().notEmpty(),
  body("phone").optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
  body("studentProfile.enrollmentNo").optional({ checkFalsy: true }).trim().isLength({ max: 30 }),
  body("studentProfile.branch").optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body("studentProfile.batchYear").optional({ checkFalsy: true }).isInt({ min: 2000, max: 2100 }).withMessage("Enter a valid batch year."),
  body("studentProfile.currentSemester").optional({ checkFalsy: true }).isInt({ min: 1, max: 8 }).withMessage("Semester must be between 1 and 8."),
  checkValidation,
];

const validateUpdateUser = [
  body("loginId").optional({ checkFalsy: true }).trim().isLength({ max: 50 }).matches(/^[a-zA-Z0-9._-]+$/).withMessage("Login ID may only contain letters, numbers, dots, dashes, and underscores."),
  body("email").optional({ checkFalsy: true }).trim().isEmail().withMessage("A valid email is required.").normalizeEmail(),
  body("fullName").optional({ checkFalsy: true }).trim().notEmpty().isLength({ max: 100 }),
  body("phone").optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
  checkValidation,
];

const validateCreateStudentProfile = [
  body("userId").trim().isUUID().withMessage("userId must be a valid account ID — use the dropdown rather than typing it."),
  body("enrollmentNo").trim().notEmpty().isLength({ max: 30 }).withMessage("Enrollment number is required."),
  body("branch").trim().notEmpty(),
  body("batchYear").isInt({ min: 2000, max: 2100 }).withMessage("Enter a valid batch year."),
  body("currentSemester").optional().isInt({ min: 1, max: 8 }).withMessage("Semester must be between 1 and 8."),
  checkValidation,
];

const validateChangePassword = [
  body("currentPassword").notEmpty().withMessage("Current password is required.").isLength({ max: 200 }),
  body("newPassword").isLength({ min: 8, max: 200 }).withMessage("Password must be at least 8 characters."),
  checkValidation,
];

const validateMarkAttendance = [
  body("date").isISO8601().withMessage("A valid date (YYYY-MM-DD) is required."),
  body("records").isArray({ min: 1 }).withMessage("At least one attendance record is required."),
  checkValidation,
];

module.exports = {
  checkValidation,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateOtpLoginRequest,
  validateOtpLoginVerify,
  validateCreateUser,
  validateUpdateUser,
  validateCreateStudentProfile,
  validateChangePassword,
  validateMarkAttendance,
};
