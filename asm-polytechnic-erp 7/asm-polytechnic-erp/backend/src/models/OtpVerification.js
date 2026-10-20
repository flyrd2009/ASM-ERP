const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const OtpVerification = sequelize.define("OtpVerification", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  otpHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  purpose: {
    // Was a Postgres ENUM restricted to a fixed list — switched to a plain
    // string so adding a new OTP purpose (e.g. otp_login) never requires an
    // ALTER TYPE migration on an already-deployed database. Valid values in
    // practice: password_reset, 2fa_login, admin_unlock_reset, otp_login.
    type: DataTypes.STRING,
    allowNull: false,
  },
  consumed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
});

module.exports = OtpVerification;
