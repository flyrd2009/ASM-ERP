// Run with: npm run seed:admin
// Creates the very first admin account (chicken-and-egg problem: someone
// needs to log in before they can create other users via the admin panel).
require("dotenv").config();
const { validateEnv } = require("../config/validateEnv");
validateEnv();

const { sequelize, User } = require("../models");
const { hashPassword } = require("./password");

async function run() {
  await sequelize.sync();

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("\n✖ SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in backend/.env before running this script.\n");
    process.exit(1);
  }

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    console.log("Admin already exists:", email);
    process.exit(0);
  }

  const passwordHash = await hashPassword(password);
  await User.create({
    loginId: "admin",
    email,
    fullName: "System Administrator",
    passwordHash,
    role: "admin",
    status: "active",
    forcePasswordReset: true, // still must set their own password on first login
  });

  console.log("Seed admin created.");
  console.log("Login ID: admin");
  console.log("Temporary password:", password);
  console.log("(You will be required to change it on first login.)");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
