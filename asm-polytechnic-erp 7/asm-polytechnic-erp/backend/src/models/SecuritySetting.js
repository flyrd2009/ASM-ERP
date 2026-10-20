const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// One row per role. Admin panel (Settings -> Security) edits these.
const SecuritySetting = sequelize.define("SecuritySetting", {
  role: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  sessionTimeoutMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 20,
  },
  maxFailedAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
  },
  lockoutMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 15,
  },
  forcePasswordResetOnUnlock: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  singleSessionEnforced: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  twoFactorRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

module.exports = SecuritySetting;
