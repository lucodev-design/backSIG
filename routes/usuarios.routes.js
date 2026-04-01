import express from "express";
import { actualizarRemuneracion, getUsuarioById } from "../controllers/usuariosController.js";
import { verifyToken, verifyAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ✅ NUEVO: obtener datos del usuario (con remuneración)
router.get("/usuarios/:id", verifyToken, getUsuarioById);

// Solo admins pueden modificar remuneraciones
router.put("/usuarios/:id/remuneracion", verifyToken, verifyAdmin, actualizarRemuneracion);

export default router;