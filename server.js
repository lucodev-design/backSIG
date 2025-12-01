import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import qrRoutes from "./routes/qr.routes.js";
import pool from "./db/db.js";
// Integramos los controladores y rutas de turnos al servidor
import turnosRoutes from "./routes/turnos.routes.js";
import asistenciasroutes from "./routes/asistencias.routes.js"
import registerUser from "./routes/registroUser.routes.js"
// Roles
import roles from "./routes/roles.routes.js";
// modulo de solo admin dentro del panel del Super Admin
import adminRoutes from "./routes/admin.routes.js";
// Para el modulo de reportes generales (panel super admin)
import reportesRouter from "./routes/reportes.routes.js";
// Para el login de admins y super admins
import authSuperAdminRoutes from "./routes/authSuperAdmin.routes.js";

// Configuracion global de horario
import Cglobal from "./routes/confiGlobal.routes.js";

// Reportes User
import reportesUser from "./routes/reportesUser.routes.js";

// reportes Generales del Super Admin
import reportesGeneralesRoutes from "./routes/reportesGenerales.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// --- CORS ---
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://sig-imn.netlify.app", // tu frontend en producción
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Preflight requests
app.options("*", cors());

// --- JSON ---
app.use(express.json());

// --- Rutas ---
app.use("/api/auth", authRoutes);
app.use("/api/qr", qrRoutes);

// TURNOS
app.use("/api/",turnosRoutes);

// Asistencias
app.use("/api/auth/asistencia", asistenciasroutes);

// Gestión de trabajdores 
app.use("/api/registro", registerUser);

// roles
app.use("/api/roles", roles)

// modulos de nuevos administradores dentro de panel del Super Admin
app.use("/api/super", adminRoutes);

// modul de reportes generales dentro del panel del administrador
app.use("/api/super/reportes",reportesRouter);

// modulo de login de super admins y admins
app.use("/api/superadmin",authSuperAdminRoutes )

// Modulo de configuarcion global
app.use("/api/Cglobal",Cglobal);

// Modulo para la gestion de reportes por el panel el admin
app.use("/api/reportes",reportesUser);

// Primer 
app.use("/api/reportes", reportesGeneralesRoutes);




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

// --- Manejo de errores ---
app.use((err, req, res, next) => {
  console.error("🔥 Error detectado:", err.stack);
  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
    error: err.message,
  });
});

// --- Iniciar servidor ---
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
});
