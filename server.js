import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";   // login, register, users, asistencia
import qrRoutes from "./routes/qr.routes.js";       // manejo de QR
import pool from "./db/db.js";                      // conexión PostgreSQL

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// --- Middleware CORS robusto ---
const allowedOrigins = [
  "http://localhost:5173",       // Vite local
  "http://localhost:3000",       // React CRA local
  "https://sig-imn.netlify.app", // Frontend producción Netlify
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // permitir requests desde Postman o curl
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `La URL ${origin} no está permitida por CORS.`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// --- Preflight para todos los requests ---
app.options("*", cors());

// --- Middleware para JSON ---
app.use(express.json());

// --- Rutas ---
app.use("/api/auth", authRoutes);
app.use("/api/qr", qrRoutes);

// --- Ruta base ---
app.get("/", (req, res) => {
  res.send("🚀 Backend corriendo en Render!");
});

// --- Endpoint prueba BD ---
app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ db_time: result.rows[0].now });
  } catch (err) {
    console.error("❌ Error en /api/test-db:", err.message);
    res.status(500).json({ error: "Error conectando a la base de datos" });
  }
});

// --- Verificar conexión BD al iniciar ---
(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Conexión a la base de datos exitosa");
  } catch (err) {
    console.error("❌ Error al conectar a la base de datos:", err.message);
  }
})();

// --- Iniciar servidor ---
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
});
