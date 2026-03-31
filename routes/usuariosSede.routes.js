// ====================================
// backend/routes/usuariosSede.routes.js
// ====================================

import express from "express";
import pool from "../db/db.js";
import { verifyToken, verifyAdminOrSuperAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);
router.use(verifyAdminOrSuperAdmin);

/**
 * GET /api/usuarios/sede/:sedeId
 * Devuelve los usuarios de una sede específica.
 * Columnas reales: id_usuario, nombre, apellidos, dni, rol_id → roles.id_rol, sede_id
 */
router.get("/sede/:sedeId", async (req, res) => {
  try {
    const { sedeId } = req.params;

    if (!sedeId || isNaN(sedeId)) {
      return res.status(400).json({ message: "ID de sede inválido." });
    }

    const result = await pool.query(
      `SELECT
         u.id_usuario,
         u.nombre,
         u.apellidos,
         u.dni,
         r.nombre AS rol
       FROM usuarios u
       LEFT JOIN roles r ON u.rol_id = r.id_rol
       WHERE u.sede_id = $1
       ORDER BY u.apellidos, u.nombre`,
      [sedeId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error en GET /api/usuarios/sede/:sedeId:", error);
    res.status(500).json({
      message: "Error al obtener usuarios de la sede.",
      error: error.message,
    });
  }
});

export default router;
