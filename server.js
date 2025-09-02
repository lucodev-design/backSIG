import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import pool from "./db/db.js"; // configuración de PostgreSQL

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas principales
app.use("/api/auth", authRoutes);

// Ruta base
app.get("/", (req, res) => {
  res.send("🚀 Backend corriendo en Render!");
});

// Endpoint para probar conexión a la BD
app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ db_time: result.rows[0].now });
  } catch (err) {
    console.error("❌ Error en /api/test-db:", err.message);
    res.status(500).json({ error: "Error conectando a la base de datos" });
  }
});

// Verificar conexión al iniciar
(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Conexión a la base de datos exitosa");
  } catch (err) {
    console.error("❌ Error al conectar a la base de datos:", err.message);
  }
})();

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
});
