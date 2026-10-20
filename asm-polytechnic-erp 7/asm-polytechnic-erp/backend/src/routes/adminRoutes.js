const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { validateCreateUser, validateUpdateUser } = require("../middleware/validators");
const { handlePhotoUpload } = require("../middleware/upload");
const { uploadUserPhoto } = require("../controllers/photoController");

// Every route here is admin-only
router.use(requireAuth, requireRole("admin"));

router.get("/users", adminController.listUsers);
router.post("/users", validateCreateUser, adminController.createUser);
router.patch("/users/:userId", validateUpdateUser, adminController.updateUser);
router.post("/users/:userId/photo", handlePhotoUpload, uploadUserPhoto);
router.post("/users/:userId/unlock", adminController.unlockUser);
router.patch("/users/:userId/status", adminController.setUserStatus);
router.delete("/users/:userId", adminController.deleteUser);
router.post("/users/:userId/reset-password", adminController.adminResetPassword);

router.get("/security-settings", adminController.getSecuritySettings);
router.patch("/security-settings/:role", adminController.updateSecuritySettings);

module.exports = router;
