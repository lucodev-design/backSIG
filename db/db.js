import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

let pool;

if (process.env.DATABASE_URL) {
  // 🌐 Configuración para Render
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Render necesita SSL
  });
  console.log("✅ Usando conexión a Render (DATABASE_URL)");
} else {
  // 🖥️ Configuración local
  pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });
  console.log("✅ Usando conexión local (variables .env)");
}

export default pool;
