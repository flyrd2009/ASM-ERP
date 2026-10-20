// Runs before anything else touches process.env. If a required variable is
// missing, this prints exactly what's missing and where to fix it, instead
// of letting some downstream library (Sequelize, jsonwebtoken, nodemailer)
// throw an opaque internal error like "url must be of type string, received
// undefined" — which is what happens when DATABASE_URL is missing/blank.

const REQUIRED = ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];

// Needed for email features (OTP, password reset, admin unlock) to work,
// but the app can still boot without them — so these only warn, not fail.
const RECOMMENDED = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];

function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key] || process.env[key].trim() === "");

  if (missing.length > 0) {
    console.error("\n✖ Cannot start — missing required environment variable(s):\n");
    for (const key of missing) console.error(`   - ${key}`);
    console.error(
      "\nMost likely cause: backend/.env doesn't exist yet, or is missing this value.\n" +
      "Fix: copy backend/.env.example to backend/.env and fill in the missing value(s), then restart.\n"
    );
    process.exit(1);
  }

  const missingRecommended = RECOMMENDED.filter((key) => !process.env[key] || process.env[key].trim() === "");
  if (missingRecommended.length > 0) {
    console.warn(
      `⚠ Missing email config (${missingRecommended.join(", ")}) — the app will start, ` +
      "but login OTPs, password resets, and account-created emails will fail until this is set in .env.\n"
    );
  }
}

module.exports = { validateEnv };
