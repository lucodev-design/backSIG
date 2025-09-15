// db.js
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

let pool;

if (process.env.DATABASE_URL) {
  // 🌐 Producción en Neon
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // necesario para Neon
    },
  });
  console.log("✅ Conectado a Neon (producción)");
} else {
  // 🖥️ Desarrollo local
  pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });
  console.log("✅ Conectado a base de datos local");
}

export default pool;
