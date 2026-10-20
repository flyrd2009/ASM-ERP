const express = require("express");
const router = express.Router();

const attendanceController = require("../controllers/attendanceController");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { validateMarkAttendance } = require("../middleware/validators");

router.use(requireAuth);

// Self-service (student)
router.get("/me", requireRole("student"), attendanceController.getMyAttendance);

// Admin/faculty
router.get("/class", requireRole("admin", "faculty"), attendanceController.getClassForDate);
router.post("/mark", requireRole("admin", "faculty"), validateMarkAttendance, attendanceController.markAttendance);
router.get("/student/:studentId", requireRole("admin", "faculty"), attendanceController.getStudentAttendance);

module.exports = router;
