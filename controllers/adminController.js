import pool from "../db/db.js";
import bcrypt from "bcrypt";

// ---------------- CREAR ADMIN ----------------
export const createAdmin = async (req, res) => {
  try {
    const { nombre, apellidos, email, password, rol, sede_id } = req.body;

    console.log("Datos recibidos:", req.body);

    if (!nombre || !email || !password || !rol || !sede_id) {
      return res.status(400).json({
        success: false,
        message: "Faltan datos obligatorios",
      });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO admins (nombre, apellidos, email, password, rol, sede_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const values = [nombre, apellidos, email, hashedPassword, rol, sede_id];

    const result = await pool.query(query, values);

    return res.status(201).json({
      success: true,
      message: "Administrador creado correctamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error en createAdmin:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear administrador",
      error,
    });
  }
};

// ---------------- LISTAR ADMIN ----------------
export const getAdmins = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.nombre, a.apellidos, a.email, a.rol, a.activo, s.nombre AS sede
      FROM admins a
      LEFT JOIN sedes s ON s.id_sede = a.sede_id
      ORDER BY a.id ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error en getAdmins:", err);
    res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};

// ---------------- UPDATE ADMIN ----------------
export const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellidos, email, password, sede_id, activo } = req.body;

    let query, values;

    if (password) {
      // Actualizar también la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);
      query = `
        UPDATE admins
        SET nombre=$1, apellidos=$2, email=$3, password=$4, sede_id=$5, activo=$6
        WHERE id=$7
      `;
      values = [nombre, apellidos, email, hashedPassword, sede_id || null, activo, id];
    } else {
      // No se cambia la contraseña
      query = `
        UPDATE admins
        SET nombre=$1, apellidos=$2, email=$3, sede_id=$4, activo=$5
        WHERE id=$6
      `;
      values = [nombre, apellidos, email, sede_id || null, activo, id];
    }

    await pool.query(query, values);

    res.json({ success: true, message: "Administrador actualizado" });
  } catch (err) {
    console.error("Error en updateAdmin:", err);
    res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};

// ---------------- DELETE ADMIN ----------------
export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM admins WHERE id=$1", [id]);

    res.json({ success: true, message: "Administrador eliminado" });
  } catch (err) {
    console.error("Error en deleteAdmin:", err);
    res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};
