// controllers/usuariosController.js
import pool from "../db/db.js";

export const actualizarRemuneracion = async (req, res) => {
  const { id } = req.params;
  const { remuneracion } = req.body;

  try {
    if (!remuneracion || remuneracion < 0) {
      return res.status(400).json({
        message: "La remuneración debe ser un monto válido mayor o igual a 0.",
      });
    }

    // ✅ PostgreSQL usa $1, $2 en vez de ?
    const result = await pool.query(
      "SELECT * FROM usuarios WHERE id_usuario = $1",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    await pool.query(
      "UPDATE usuarios SET remuneracion = $1 WHERE id_usuario = $2",
      [remuneracion, id],
    );

    res.json({ message: "Remuneración actualizada correctamente." });
  } catch (error) {
    console.error("❌ Error al actualizar remuneración:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// Funcon para traer las remuneraciones del trabajador

export const getUsuarioById = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellidos, u.email, u.remuneracion,
              s.nombre AS sede, t.nombre_turno AS turno
       FROM usuarios u
       LEFT JOIN sedes s ON u.sede_id = s.id_sede
       LEFT JOIN turnos t ON u.turno_id = t.id_turno
       WHERE u.id_usuario = $1`,
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Usuario no encontrado." });
    res.json(rows[0]);
  } catch (error) {
    console.error("❌ Error obteniendo usuario:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};