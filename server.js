import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import pool from "./db/db.js";  // tu configuración de pg

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas principales
app.use("/api/auth", authRoutes);

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("🚀 Backend corriendo en Render!");
});

// Verificar conexión a la BD en un endpoint (mejor que al arrancar)
app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ db_time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
});
