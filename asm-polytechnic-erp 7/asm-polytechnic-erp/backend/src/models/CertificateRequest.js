const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const CERT_TYPES = ["bonafide", "transfer_certificate", "migration_certificate", "provisional_marksheet"];

const CertificateRequest = sequelize.define("CertificateRequest", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  certType: {
    type: DataTypes.ENUM(...CERT_TYPES),
    allowNull: false,
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("pending", "approved", "rejected", "ready_for_pickup"),
    defaultValue: "pending",
  },
  adminNote: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = { CertificateRequest, CERT_TYPES };
