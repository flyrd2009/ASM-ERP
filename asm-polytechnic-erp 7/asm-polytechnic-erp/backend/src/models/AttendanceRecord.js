const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ATTENDANCE_STATUSES = ["present", "absent", "leave", "holiday"];

// One row per student per calendar date. A unique index on (studentId, date)
// means marking the same day twice is an update, not a duplicate row —
// matches how a real attendance register works (correcting a mistake
// overwrites it, it doesn't create a second entry for that day).
const AttendanceRecord = sequelize.define(
  "AttendanceRecord",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...ATTENDANCE_STATUSES),
      allowNull: false,
    },
    markedByUserId: {
      // The faculty/admin account that marked it — null for system-generated
      // holiday rows, if that's ever added later.
      type: DataTypes.UUID,
      allowNull: true,
    },
    remarks: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    indexes: [{ unique: true, fields: ["student_id", "date"] }],
  }
);

module.exports = { AttendanceRecord, ATTENDANCE_STATUSES };
