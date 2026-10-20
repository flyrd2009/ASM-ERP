const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const PasswordHistory = sequelize.define("PasswordHistory", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = PasswordHistory;
