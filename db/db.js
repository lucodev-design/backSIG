import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Render te da esta URL
  ssl: { rejectUnauthorized: false }, // necesario en Render
});

export default pool;
