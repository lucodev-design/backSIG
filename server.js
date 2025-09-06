import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";        // ✅ corregido
import asistenciaRoutes from "./routes/asistencia.routes.js";  // ✅ corregido
import qrRoutes from "./routes/qr.routes.js";            // ✅ corregido
import pool from "./db/db.js"; // ✅ corregido

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",        // Vite (frontend local)
      "http://localhost:3000",        // CRA u otros
      "https://sig-imn.netlify.app",  // Producción (tu Netlify)
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Responder a preflight OPTIONS
app.options("*", cors());

// Middleware para parsear JSON
app.use(express.json());

// 📌 Rutas principales
app.use("/api/auth", authRoutes);
app.use("/api/asistencia", asistenciaRoutes);
app.use("/api/qr", qrRoutes);

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
