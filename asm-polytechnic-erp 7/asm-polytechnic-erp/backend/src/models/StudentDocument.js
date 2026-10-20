const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const DOC_TYPES = ["10th_certificate", "12th_certificate", "transfer_certificate", "id_proof", "photo", "other"];

// Metadata only — actual file bytes belong in object storage (S3/Cloudinary)
// once that's wired up. fileUrl holds wherever the file actually lives.
const StudentDocument = sequelize.define("StudentDocument", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  docType: {
    type: DataTypes.ENUM(...DOC_TYPES),
    allowNull: false,
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true, // null until actual storage is wired up
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

module.exports = { StudentDocument, DOC_TYPES };
