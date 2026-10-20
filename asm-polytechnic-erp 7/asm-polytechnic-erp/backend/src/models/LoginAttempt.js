const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const LoginAttempt = sequelize.define("LoginAttempt", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true, // null if loginId didn't match any user
  },
  loginIdAttempted: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  success: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  reason: {
    type: DataTypes.STRING, // e.g. "bad_password", "locked", "ok", "new_device"
    allowNull: true,
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = LoginAttempt;
