import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:*123456789*@localhost:5432/gestion_empresarial",
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false } // Render requiere SSL
    : false // en local no se usa SSL
});

export default pool;
