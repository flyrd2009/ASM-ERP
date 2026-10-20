require("dotenv").config();
const { validateEnv } = require("./config/validateEnv");
validateEnv();

require("express-async-errors"); // MUST load before routes: patches Express 4 to forward
                                   // rejected promises to the error handler instead of
                                   // crashing/hanging the request silently.
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const { sequelize } = require("./models");
const { apiLimiter } = require("./middleware/rateLimiters");
const { sanitizeInput } = require("./middleware/sanitize");
const { preventParamPollution } = require("./middleware/paramPollution");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
const { initWhatsApp } = require("./utils/whatsapp");
const path = require("path");

const app = express();

// Required on Render/Neon/any platform behind a reverse proxy — without this,
// req.ip resolves to the proxy's IP for every request, which breaks per-IP
// rate limiting and makes the audit log (LoginAttempt.ip) useless.
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"], // this is a JSON API — it serves no HTML/JS of its own
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "same-site" },
  })
);
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));

// Body size capped — an ERP login/profile payload is never anywhere near this,
// so this mainly blocks oversized-payload DoS attempts.
app.use(express.json({ limit: "50kb" }));
app.use(cookieParser());

app.use(sanitizeInput); // strips <script>/HTML from string fields in body/query/params
app.use(preventParamPollution); // collapses duplicate query params (e.g. ?role=admin&role=student)

// Uploaded profile photos. Helmet's default Cross-Origin-Resource-Policy is
// "same-site", which would stop a frontend on a different domain from
// displaying them — relaxed for this one path only. Filenames are random
// UUIDs, and nothing here is directory-listable.
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(__dirname, "..", "uploads"), { index: false, dotfiles: "ignore", maxAge: "7d" })
);

app.use("/api/", apiLimiter);

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "ASM Polytechnic ERP API" }));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/availability", availabilityRoutes);

// Unknown API route
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

// Central error handler — every thrown/rejected error in a route (including
// async ones, thanks to express-async-errors) lands here. Never leaks stack
// traces, SQL text, or internal messages to the client; those are logged
// server-side only.
app.use((err, req, res, next) => {
  console.error(err);

  if (err.name === "SequelizeValidationError" || err.name === "SequelizeUniqueConstraintError") {
    return res.status(400).json({ error: "Invalid or duplicate data submitted." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request too large." });
  }
  if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({ error: "Malformed request." });
  }
  if (err.name === "SequelizeConnectionError" || err.name === "SequelizeConnectionRefusedError" || err.name === "SequelizeHostNotFoundError") {
    return res.status(503).json({ error: "Service temporarily unavailable. Please try again shortly." });
  }
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "Origin not allowed." });
  }

  return res.status(err.status || 500).json({ error: "Something went wrong. Please try again." });
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.sync(); // use migrations instead of sync() in production
    console.log("Database connected.");
    initWhatsApp(); // no-op unless WHATSAPP_ENABLED=true; never blocks or crashes startup
    app.listen(PORT, () => console.log(`ASM ERP API running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

// Catch anything that still slips through (e.g. errors in non-request code)
// so the process logs clearly instead of dying with an opaque crash.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

start();
