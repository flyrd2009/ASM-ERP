const { Sequelize } = require("sequelize");
require("dotenv").config();

// Single Sequelize instance shared across all models.
// On Render, set DATABASE_URL to the managed Postgres connection string —
// no local Postgres install needed (zero local setup).
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  dialectOptions:
    process.env.NODE_ENV === "production"
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},
  define: {
    underscored: true,
    timestamps: true,
  },
});

module.exports = sequelize;



sequelize.authenticate()
  .then(async () => {
    const [result] = await sequelize.query(`
      SELECT current_database() AS db,
             current_schema() AS schema,
             current_user AS db_user
    `);
    console.log("Connected database details:", result);
  })
  .catch(console.error);
