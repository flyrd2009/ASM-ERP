// Usage: router.get("/admin/users", requireAuth, requireRole("admin"), handler)
// Must run AFTER requireAuth so req.user is populated.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission to access this resource." });
    }
    return next();
  };
}

module.exports = { requireRole };
