const { AttendanceRecord, Student, User, ATTENDANCE_STATUSES } = require("../models");
const { Op } = require("sequelize");

// Admin/faculty: get the roster for a branch+semester, with each student's
// existing mark for the given date (if any) — used to prefill the marking
// screen so re-opening a date shows what was already recorded.
async function getClassForDate(req, res) {
  const { branch, semester, date } = req.query;
  if (!branch || !semester || !date) {
    return res.status(400).json({ error: "branch, semester, and date are required." });
  }

  const students = await Student.findAll({
    where: { branch, currentSemester: semester, admissionStatus: "active" },
    include: [{ model: User, attributes: ["fullName", "loginId"] }],
    order: [["enrollmentNo", "ASC"]],
  });

  const studentIds = students.map((s) => s.id);
  const existing = await AttendanceRecord.findAll({ where: { studentId: { [Op.in]: studentIds }, date } });
  const existingByStudent = Object.fromEntries(existing.map((r) => [r.studentId, r.status]));

  const roster = students.map((s) => ({
    studentId: s.id,
    enrollmentNo: s.enrollmentNo,
    fullName: s.User?.fullName,
    status: existingByStudent[s.id] || null,
  }));

  return res.status(200).json({ roster });
}

// Admin/faculty: bulk mark/update attendance for a class on a given date.
async function markAttendance(req, res) {
  const { date, records } = req.body;
  if (!date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: "date and a non-empty records array are required." });
  }

  for (const r of records) {
    if (!r.studentId || !ATTENDANCE_STATUSES.includes(r.status)) {
      return res.status(400).json({ error: `Invalid record: each entry needs a studentId and a valid status (${ATTENDANCE_STATUSES.join(", ")}).` });
    }
  }

  const results = [];
  for (const r of records) {
    const [record] = await AttendanceRecord.findOrCreate({
      where: { studentId: r.studentId, date },
      defaults: { status: r.status, markedByUserId: req.user.sub, remarks: r.remarks || null },
    });
    if (record.status !== r.status || r.remarks !== undefined) {
      record.status = r.status;
      record.markedByUserId = req.user.sub;
      if (r.remarks !== undefined) record.remarks = r.remarks || null;
      await record.save();
    }
    results.push(record);
  }

  return res.status(200).json({ message: `Attendance saved for ${results.length} student(s) on ${date}.`, count: results.length });
}

// Admin/faculty: full attendance history for one specific student
async function getStudentAttendance(req, res) {
  const { studentId } = req.params;
  const { year, month } = req.query;

  const where = { studentId };
  if (year && month) {
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(Number(year), Number(month), 0).getDate();
    const end = `${year}-${String(month).padStart(2, "0")}-${String(endDate).padStart(2, "0")}`;
    where.date = { [Op.between]: [start, end] };
  }

  const records = await AttendanceRecord.findAll({ where, order: [["date", "ASC"]] });
  return res.status(200).json({ records, stats: computeStats(records) });
}

// Student: their own attendance, optionally filtered to a month
async function getMyAttendance(req, res) {
  const student = await Student.findOne({ where: { userId: req.user.sub } });
  if (!student) return res.status(404).json({ error: "No student profile found for this account." });

  const { year, month } = req.query;
  const where = { studentId: student.id };
  if (year && month) {
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(Number(year), Number(month), 0).getDate();
    const end = `${year}-${String(month).padStart(2, "0")}-${String(endDate).padStart(2, "0")}`;
    where.date = { [Op.between]: [start, end] };
  }

  const records = await AttendanceRecord.findAll({ where, order: [["date", "ASC"]] });
  return res.status(200).json({ records, stats: computeStats(records) });
}

function computeStats(records) {
  const total = records.length;
  const counts = { present: 0, absent: 0, leave: 0, holiday: 0 };
  for (const r of records) counts[r.status] = (counts[r.status] || 0) + 1;

  // Percentage is calculated against school days only — holidays don't count
  // against a student, so they're excluded from the denominator.
  const schoolDays = total - counts.holiday;
  const presentPct = schoolDays > 0 ? Math.round((counts.present / schoolDays) * 1000) / 10 : 0;

  return { total, ...counts, schoolDays, presentPercentage: presentPct };
}

module.exports = { getClassForDate, markAttendance, getStudentAttendance, getMyAttendance };
