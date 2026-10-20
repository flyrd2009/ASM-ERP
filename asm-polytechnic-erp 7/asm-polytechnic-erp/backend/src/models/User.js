const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Roles supported by the ERP login system
const ROLES = ["admin", "faculty", "student", "parent", "accounts"];

const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  loginId: {
    // Enrollment No. for students, Employee ID for staff, username for admin
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  photoUrl: {
    // Relative path to an uploaded profile photo (e.g. /uploads/photos/<uuid>.jpg).
    // Lives on User, not Student, so faculty/staff/admin accounts can have one too.
    type: DataTypes.STRING,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM(...ROLES),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("active", "disabled", "locked"),
    defaultValue: "active",
  },
  failedAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  lockedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  forcePasswordReset: {
    type: DataTypes.BOOLEAN,
    defaultValue: true, // true on first login / after admin unlock
  },
  twoFactorEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastLoginIp: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = { User, ROLES };
