const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// One-to-one with User (role="student"). Kept separate from User so the
// login/auth table stays lean and role-agnostic — academic fields live here.
const BRANCHES = ["Computer Engineering", "Mechanical Engineering", "Civil Engineering", "Electrical Engineering", "Electronics Engineering"];

const Student = sequelize.define("Student", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  enrollmentNo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  branch: {
    type: DataTypes.ENUM(...BRANCHES),
    allowNull: false,
  },
  batchYear: {
    // e.g. 2024 — the year this student's batch was admitted
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  currentSemester: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: { min: 1, max: 8 },
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  guardianName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  guardianPhone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  admissionStatus: {
    type: DataTypes.ENUM("active", "on_leave", "graduated", "dropped_out"),
    defaultValue: "active",
  },
});

module.exports = { Student, BRANCHES };
