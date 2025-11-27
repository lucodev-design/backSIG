import pool from "../db/db.js";


// ---------------- CREAR ROL ----------------
export const createRol = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ success: false, message: "Falta nombre del rol" });

    const { rows } = await pool.query(
      "INSERT INTO roles (nombre) VALUES ($1) RETURNING id_rol, nombre",
      [nombre]
    );

    res.json({ success: true, rol: rows[0] });
  } catch (err) {
    console.error("Error en createRol:", err);
    res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};

// ---------------- LISTAR ROLES ----------------
export const getRoles = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id_rol, nombre FROM roles ORDER BY id_rol");
    // devolvemos un array simple (útil para selects en el frontend)
    res.json(rows);
  } catch (err) {
    console.error("Error en getRoles:", err);
    res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};

// ---------------- EDITAR ROL ----------------
export const updateRol = async (req, res) => {
  try {
    const { id_rol } = req.params;
    const { nombre } = req.body;

    if (!nombre)
      return res.status(400).json({ success: false, message: "Falta el nombre del rol" });

    // Validar existencia
    const rolExistente = await pool.query(
      "SELECT id_rol FROM roles WHERE id_rol = $1",
      [id_rol]
    );

    if (rolExistente.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Rol no encontrado" });
    }

    // Actualizar
    const { rows } = await pool.query(
      "UPDATE roles SET nombre = $1 WHERE id_rol = $2 RETURNING id_rol, nombre",
      [nombre, id_rol]
    );

    return res.json({ success: true, rol: rows[0] });

  } catch (err) {
    console.error("Error en updateRol:", err);
    return res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};

// ---------------- ELIMINAR ROL ----------------
export const deleteRol = async (req, res) => {
  try {
    const { id_rol } = req.params;

    // Verificar si existe
    const rolExistente = await pool.query(
      "SELECT id_rol FROM roles WHERE id_rol = $1",
      [id_rol]
    );

    if (rolExistente.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Rol no encontrado" });
    }

    // Eliminar
    await pool.query("DELETE FROM roles WHERE id_rol = $1", [id_rol]);

    return res.json({ success: true, message: "Rol eliminado correctamente" });

  } catch (err) {
    console.error("Error en deleteRol:", err);
    return res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};
