const express = require("express");
const router = express.Router();

const { checkAvailability } = require("../controllers/availabilityController");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");

router.get("/", requireAuth, requireRole("admin", "faculty"), checkAvailability);

module.exports = router;
