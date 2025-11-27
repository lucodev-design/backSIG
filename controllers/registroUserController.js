
import pool from "../db/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// ---------------- REGISTRO USUARIO FORMULARIO ----------------

export const registerUser = async (req, res) => {
  try {
    const { nombre, apellidos, dni, email, password, rol_id, sede_id, turno_id } = req.body;

    if (!nombre || !apellidos || !dni || !email || !password || !rol_id || !sede_id) {
      return res.status(400).json({ mensaje: "⚠️ Faltan datos obligatorios." });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar usuario y devolver id_usuario
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, apellidos, dni, email, password, rol_id, sede_id, turno_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id_usuario`,
      [nombre, apellidos, dni, email, hashedPassword, rol_id, sede_id, turno_id || null]
    );

    const id_usuario = result.rows[0]?.id_usuario;
    if (!id_usuario) throw new Error("No se pudo obtener el ID del usuario recién creado.");

    // Generar y guardar el código QR (en este caso el ID)
    const qrCode = id_usuario.toString();
    await pool.query("UPDATE usuarios SET qr_code = $1 WHERE id_usuario = $2", [qrCode, id_usuario]);

    console.log(`✅ Usuario registrado con ID ${id_usuario}`);

    res.status(201).json({
      mensaje: "✅ Usuario registrado con éxito",
      usuario: { id_usuario, qr_code: qrCode },
    });
  } catch (error) {
    console.error("❌ Error registrando usuario:", error.message);
    res.status(500).json({
      mensaje: "❌ Error registrando usuario",
      detalle: error.message,
    });
  }
};

// Para el contador u administracion de los usuarios o trabajdores
// ---------------- GET USERS ----------------
export const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        u.id_usuario, 
        u.nombre, 
        u.apellidos, 
        u.dni, 
        u.email, 
        u.rol_id,                    -- 👈 ID del rol para el frontend
        u.sede_id,                   -- 👈 ID de la sede para filtrar
        r.nombre AS rol, 
        s.nombre AS sede, 
        u.qr_code,
        u.turno_id,                  -- 👈 ID del turno
        t.nombre_turno AS turno      -- 👈 Nombre del turno
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id_rol
       JOIN sedes s ON u.sede_id = s.id_sede
       LEFT JOIN turnos t ON u.turno_id = t.id_turno
       ORDER BY u.id_usuario ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error en getUsers:", error);
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
};

// ---------------- DELETE USER ----------------
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Eliminamos el usuario
    const result = await pool.query(
      "DELETE FROM usuarios WHERE id_usuario = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({
      message: "✅ Usuario eliminado correctamente",
      usuario: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error al eliminar usuario:", err.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// ---------------- UPDATE USER ----------------
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellidos, dni, email, rol_id, sede_id, turno_id } = req.body;

    // Verificar si el usuario existe
    const checkUser = await pool.query(
      "SELECT * FROM usuarios WHERE id_usuario = $1",
      [id]
    );

    if (checkUser.rowCount === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Actualizar el usuario
    const result = await pool.query(
      `UPDATE usuarios 
       SET nombre = $1, apellidos = $2, dni = $3, email = $4, 
           rol_id = $5, sede_id = $6, turno_id = $7
       WHERE id_usuario = $8 
       RETURNING *`,
      [nombre, apellidos, dni, email, rol_id, sede_id, turno_id || null, id]
    );

    // Obtener datos completos con joins para la respuesta
    const updatedUser = await pool.query(
      `SELECT 
        u.id_usuario, 
        u.nombre, 
        u.apellidos, 
        u.dni, 
        u.email, 
        u.rol_id,
        u.sede_id,
        r.nombre AS rol, 
        s.nombre AS sede, 
        u.qr_code,
        u.turno_id,
        t.nombre_turno AS turno
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id_rol
       JOIN sedes s ON u.sede_id = s.id_sede
       LEFT JOIN turnos t ON u.turno_id = t.id_turno
       WHERE u.id_usuario = $1`,
      [id]
    );

    res.json({
      message: "Usuario actualizado correctamente",
      usuario: updatedUser.rows[0],
    });
  } catch (err) {
    console.error("❌ Error al actualizar usuario:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};