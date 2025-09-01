import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import pool from "./db/db.js";  // 👈 importa tu conexión a la BD

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Rutas
app.use("/api/auth", authRoutes);

// Verificar conexión a la BD
pool.connect()
  .then(client => {
    console.log("✅ Conexión a la BD exitosa");
    client.release();
  })
  .catch(err => {
    console.error("❌ Error conectando a la BD:", err.message);
  });

app.listen(4000, () => {
  console.log("Servidor corriendo en http://localhost:4000");
});
