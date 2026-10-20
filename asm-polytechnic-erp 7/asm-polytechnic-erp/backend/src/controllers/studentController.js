const { Student, StudentDocument, CertificateRequest, User } = require("../models");

// A student viewing their own profile
async function getMyProfile(req, res) {
  const student = await Student.findOne({
    where: { userId: req.user.sub },
    include: [{ model: StudentDocument }, { model: CertificateRequest }],
  });
  if (!student) return res.status(404).json({ error: "No student profile found for this account." });
  return res.status(200).json({ student });
}

// Admin/faculty: enroll a student profile onto an existing user account
// (the account itself is created separately via admin.createUser with role="student")
async function createProfile(req, res) {
  const { userId, enrollmentNo, branch, batchYear, currentSemester, dateOfBirth, address, guardianName, guardianPhone } = req.body;

  if (!userId || !enrollmentNo || !branch || !batchYear) {
    return res.status(400).json({ error: "userId, enrollmentNo, branch, and batchYear are required." });
  }

  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ error: "User account not found." });
  if (user.role !== "student") {
    return res.status(400).json({ error: "That account is not a student account." });
  }

  const existing = await Student.findOne({ where: { userId } });
  if (existing) return res.status(409).json({ error: "This user already has a student profile." });

  const student = await Student.create({
    userId,
    enrollmentNo,
    branch,
    batchYear,
    currentSemester: currentSemester || 1,
    dateOfBirth: dateOfBirth || null,
    address: address || null,
    guardianName: guardianName || null,
    guardianPhone: guardianPhone || null,
  });

  return res.status(201).json({ message: "Student profile created.", student });
}

// Admin/faculty: list & filter students — SIS main table
// Accounts with role="student" that don't have a Student profile yet —
// feeds the enrollment dropdown so an admin never has to manually find and
// type a UUID (that used to be the only way, and typing anything invalid
// there crashed with a raw database error instead of a clean message).
async function listUnlinkedStudentAccounts(req, res) {
  const { Op } = require("sequelize");
  const linkedUserIds = (await Student.findAll({ attributes: ["userId"] })).map((s) => s.userId);

  const users = await User.findAll({
    where: {
      role: "student",
      ...(linkedUserIds.length > 0 ? { id: { [Op.notIn]: linkedUserIds } } : {}),
    },
    attributes: ["id", "fullName", "loginId", "email"],
    order: [["fullName", "ASC"]],
  });

  return res.status(200).json({ users });
}

async function listStudents(req, res) {
  const { branch, batchYear, semester, search } = req.query;
  const where = {};
  if (branch) where.branch = branch;
  if (batchYear) where.batchYear = batchYear;
  if (semester) where.currentSemester = semester;

  const { Op } = require("sequelize");
  const userWhere = {};
  if (search) {
    userWhere[Op.or] = [{ fullName: { [Op.iLike]: `%${search}%` } }, { loginId: { [Op.iLike]: `%${search}%` } }];
  }

  const students = await Student.findAll({
    where,
    include: [{ model: User, attributes: ["fullName", "loginId", "email", "phone", "status"], where: userWhere }],
    order: [["enrollmentNo", "ASC"]],
    limit: 200,
  });

  return res.status(200).json({ students });
}

// Admin/faculty: get one student's full record
async function getStudent(req, res) {
  const student = await Student.findByPk(req.params.studentId, {
    include: [
      { model: User, attributes: ["id", "fullName", "loginId", "email", "phone", "status", "lockedUntil", "photoUrl"] },
      { model: StudentDocument },
      { model: CertificateRequest },
    ],
  });
  if (!student) return res.status(404).json({ error: "Student not found." });
  return res.status(200).json({ student });
}

// Admin/faculty: update academic fields (semester promotion, branch correction, status)
async function updateStudent(req, res) {
  const student = await Student.findByPk(req.params.studentId);
  if (!student) return res.status(404).json({ error: "Student not found." });

  if (req.body.enrollmentNo !== undefined && req.body.enrollmentNo !== student.enrollmentNo) {
    const { Op } = require("sequelize");
    const existing = await Student.findOne({
      where: { enrollmentNo: req.body.enrollmentNo, id: { [Op.ne]: student.id } },
    });
    if (existing) {
      return res.status(409).json({ error: "That enrollment number is already in use by another student." });
    }
  }

  const allowed = ["enrollmentNo", "branch", "batchYear", "currentSemester", "dateOfBirth", "address", "guardianName", "guardianPhone", "admissionStatus"];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  await student.update(updates);

  return res.status(200).json({ message: "Student record updated.", student });
}

// Student adds a document to their own profile
async function addMyDocument(req, res) {
  const student = await Student.findOne({ where: { userId: req.user.sub } });
  if (!student) return res.status(404).json({ error: "No student profile found for this account." });

  const { docType, fileName, fileUrl } = req.body;
  if (!docType || !fileName) {
    return res.status(400).json({ error: "docType and fileName are required." });
  }

  const doc = await StudentDocument.create({ studentId: student.id, docType, fileName, fileUrl: fileUrl || null });
  return res.status(201).json({ message: "Document added.", document: doc });
}

// Admin/faculty adds a document on behalf of a specific student
async function addDocumentForStudent(req, res) {
  const { studentId } = req.params;
  const student = await Student.findByPk(studentId);
  if (!student) return res.status(404).json({ error: "Student not found." });

  const { docType, fileName, fileUrl } = req.body;
  if (!docType || !fileName) {
    return res.status(400).json({ error: "docType and fileName are required." });
  }

  const doc = await StudentDocument.create({ studentId, docType, fileName, fileUrl: fileUrl || null });
  return res.status(201).json({ message: "Document added.", document: doc });
}

// Admin: mark a document verified/unverified
async function verifyDocument(req, res) {
  const doc = await StudentDocument.findByPk(req.params.docId);
  if (!doc) return res.status(404).json({ error: "Document not found." });
  doc.verified = req.body.verified !== undefined ? !!req.body.verified : true;
  await doc.save();
  return res.status(200).json({ message: "Document status updated.", document: doc });
}

// Student requests a certificate (bonafide, transfer cert, etc.)
async function requestCertificate(req, res) {
  const student = await Student.findOne({ where: { userId: req.user.sub } });
  if (!student) return res.status(404).json({ error: "No student profile found for this account." });

  const { certType, reason } = req.body;
  if (!certType) return res.status(400).json({ error: "certType is required." });

  const request = await CertificateRequest.create({ studentId: student.id, certType, reason: reason || null });
  return res.status(201).json({ message: "Certificate request submitted.", request });
}

// Admin/faculty: list all pending certificate requests across students
async function listCertificateRequests(req, res) {
  const { status } = req.query;
  const where = {};
  if (status) where.status = status;

  const requests = await CertificateRequest.findAll({
    where,
    include: [{ model: Student, include: [{ model: User, attributes: ["fullName", "loginId"] }] }],
    order: [["createdAt", "DESC"]],
    limit: 200,
  });
  return res.status(200).json({ requests });
}

// Admin/faculty: approve/reject/mark-ready a certificate request
async function updateCertificateRequest(req, res) {
  const request = await CertificateRequest.findByPk(req.params.requestId);
  if (!request) return res.status(404).json({ error: "Request not found." });

  const { status, adminNote } = req.body;
  const allowedStatuses = ["pending", "approved", "rejected", "ready_for_pickup"];
  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${allowedStatuses.join(", ")}` });
  }

  if (status) request.status = status;
  if (adminNote !== undefined) request.adminNote = adminNote;
  await request.save();

  return res.status(200).json({ message: "Request updated.", request });
}

module.exports = {
  getMyProfile,
  createProfile,
  listStudents,
  listUnlinkedStudentAccounts,
  getStudent,
  updateStudent,
  addMyDocument,
  addDocumentForStudent,
  verifyDocument,
  requestCertificate,
  listCertificateRequests,
  updateCertificateRequest,
};
