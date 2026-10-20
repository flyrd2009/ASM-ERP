
const bcrypt = require("bcrypt");
const { User } = require("../models");

async function resetAdmin() {
  try {
    const newEmail = process.env.NEW_ADMIN_EMAIL;
    const newPassword = process.env.NEW_ADMIN_PASSWORD;

    if (!newEmail || !newPassword) {
      throw new Error(
        "Set NEW_ADMIN_EMAIL and NEW_ADMIN_PASSWORD in your environment first."
      );
    }

    if (newPassword.length < 12) {
      throw new Error("Use a password of at least 12 characters.");
    }

    const admin = await User.findOne({
      where: { loginId: "admin" },
    });

    if (!admin) {
      throw new Error("Admin account with loginId 'admin' was not found.");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await admin.update({
      email: newEmail,
      passwordHash,
      failedAttempts: 0,
      lockedUntil: null,
    });

    console.log("Admin email and password updated successfully.");
    console.log("Login ID:", admin.loginId);
    console.log("Email:", admin.email);
  } catch (error) {
    console.error("Admin reset failed:", error.message);
    process.exitCode = 1;
  } finally {
    await User.sequelize.close();
  }
}

resetAdmin();
