const { verifyAccessToken } = require("../utils/token");

// Protects any route: requires a valid, non-expired access token in the
// Authorization header. Does NOT touch the DB — cheap, runs on every request.
// Session-level checks (inactivity, revocation) happen in /refresh instead,
// since the access token itself is short-lived (15m) by design.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload; // { sub, role, loginId }
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired access token." });
  }
}

module.exports = { requireAuth };
