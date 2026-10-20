const sequelize = require("../config/db");
const { User, ROLES } = require("./User");
const Session = require("./Session");
const OtpVerification = require("./OtpVerification");
const SecuritySetting = require("./SecuritySetting");
const PasswordHistory = require("./PasswordHistory");
const LoginAttempt = require("./LoginAttempt");
const { Student, BRANCHES } = require("./Student");
const { StudentDocument, DOC_TYPES } = require("./StudentDocument");
const { CertificateRequest, CERT_TYPES } = require("./CertificateRequest");
const { AttendanceRecord, ATTENDANCE_STATUSES } = require("./AttendanceRecord");
const { Announcement } = require("./Announcement");

User.hasMany(Session, { foreignKey: "userId" });
Session.belongsTo(User, { foreignKey: "userId" });

User.hasMany(OtpVerification, { foreignKey: "userId" });
OtpVerification.belongsTo(User, { foreignKey: "userId" });

User.hasMany(PasswordHistory, { foreignKey: "userId" });
PasswordHistory.belongsTo(User, { foreignKey: "userId" });

User.hasMany(LoginAttempt, { foreignKey: "userId" });
LoginAttempt.belongsTo(User, { foreignKey: "userId" });

User.hasOne(Student, { foreignKey: "userId" });
Student.belongsTo(User, { foreignKey: "userId" });

Student.hasMany(StudentDocument, { foreignKey: "studentId" });
StudentDocument.belongsTo(Student, { foreignKey: "studentId" });

Student.hasMany(CertificateRequest, { foreignKey: "studentId" });
CertificateRequest.belongsTo(Student, { foreignKey: "studentId" });

Student.hasMany(AttendanceRecord, { foreignKey: "studentId" });
AttendanceRecord.belongsTo(Student, { foreignKey: "studentId" });

User.hasMany(Announcement, { foreignKey: "postedByUserId" });
Announcement.belongsTo(User, { foreignKey: "postedByUserId", as: "postedBy" });

module.exports = {
  sequelize,
  User,
  ROLES,
  Session,
  OtpVerification,
  SecuritySetting,
  PasswordHistory,
  LoginAttempt,
  Student,
  BRANCHES,
  StudentDocument,
  DOC_TYPES,
  CertificateRequest,
  CERT_TYPES,
  AttendanceRecord,
  ATTENDANCE_STATUSES,
};
