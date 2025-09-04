import express from "express";
import pool from "../db/db.js";

const router = express.Router();

router.post("/marcar", async (req, res) => {
  try {
    const { qr, ubicacion } = req.body;
    if (!qr) return res.status(400).json({ mensaje: "QR inválido" });

    // Buscar usuario por QR (puede ser email o id codificado en QR)
    const usuario = await pool.query(
      "SELECT * FROM usuarios WHERE id::text = $1 OR email = $1",
      [qr]
    );

    if (usuario.rows.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const idUsuario = usuario.rows[0].id;
    const hoy = new Date().toISOString().split("T")[0];

    // Verificar si ya existe registro de hoy
    const registro = await pool.query(
      "SELECT * FROM asistencia WHERE usuario_id=$1 AND fecha=$2",
      [idUsuario, hoy]
    );

    if (registro.rows.length === 0) {
      // Registrar ENTRADA
      await pool.query(
        "INSERT INTO asistencia (usuario_id, fecha, hora_entrada, ubicacion) VALUES ($1, $2, NOW(), $3)",
        [idUsuario, hoy, ubicacion]
      );
      return res.json({ mensaje: `Entrada registrada ✅ para ${usuario.rows[0].nombre}` });
    } else if (!registro.rows[0].hora_salida) {
      // Registrar SALIDA
      await pool.query(
        "UPDATE asistencia SET hora_salida=NOW(), ubicacion=$1 WHERE id=$2",
        [ubicacion, registro.rows[0].id]
      );
      return res.json({ mensaje: `Salida registrada ✅ para ${usuario.rows[0].nombre}` });
    } else {
      return res.json({ mensaje: "Ya registraste entrada y salida hoy." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error en el servidor" });
  }
});

export default router;
