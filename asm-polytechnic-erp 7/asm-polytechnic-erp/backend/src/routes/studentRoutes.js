const express = require("express");
const router = express.Router();

const studentController = require("../controllers/studentController");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { validateCreateStudentProfile } = require("../middleware/validators");
const { handlePhotoUpload } = require("../middleware/upload");
const { uploadStudentPhoto } = require("../controllers/photoController");

router.use(requireAuth);

// Self-service (student role)
router.get("/me", requireRole("student"), studentController.getMyProfile);
router.post("/me/documents", requireRole("student"), studentController.addMyDocument);
router.post("/me/certificate-requests", requireRole("student"), studentController.requestCertificate);

// Admin/faculty management
router.post("/", requireRole("admin", "faculty"), validateCreateStudentProfile, studentController.createProfile);
router.get("/", requireRole("admin", "faculty"), studentController.listStudents);
router.get("/certificate-requests", requireRole("admin", "faculty"), studentController.listCertificateRequests);
router.patch("/certificate-requests/:requestId", requireRole("admin", "faculty"), studentController.updateCertificateRequest);
router.get("/unlinked-accounts", requireRole("admin", "faculty"), studentController.listUnlinkedStudentAccounts);
router.post("/:studentId/photo", requireRole("admin", "faculty"), handlePhotoUpload, uploadStudentPhoto);
router.get("/:studentId", requireRole("admin", "faculty"), studentController.getStudent);
router.patch("/:studentId", requireRole("admin", "faculty"), studentController.updateStudent);
router.post("/:studentId/documents", requireRole("admin", "faculty"), studentController.addDocumentForStudent);
router.patch("/documents/:docId/verify", requireRole("admin", "faculty"), studentController.verifyDocument);

module.exports = router;
