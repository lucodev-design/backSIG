import pool from "../db/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// ---------------- REGISTRO USUARIO FORMULARIO ----------------
// controllers/auth.controllers.js
export const registerUser = async (req, res) => {
  try {
    const { nombre, apellidos, dni, email, password, rol_id, sede_id } = req.body;

    if (!nombre || !apellidos || !dni || !email || !password || !rol_id || !sede_id) {
      return res.status(400).json({ mensaje: "Faltan datos" });
    }

    // encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // insertar usuario y devolver id_usuario
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, apellidos, dni, email, password, rol_id, sede_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id_usuario`,
      [nombre, apellidos, dni, email, hashedPassword, rol_id, sede_id]
    );

    const id_usuario = result.rows[0].id_usuario;

    // actualizar qr_code con el id_usuario
    await pool.query(
      "UPDATE usuarios SET qr_code = $1 WHERE id_usuario = $1",
      [id_usuario]
    );

    res.status(201).json({ mensaje: "✅ Usuario registrado con éxito", id_usuario, qr_code: id_usuario });
  } catch (error) {
    console.error("❌ Error registrando usuario:", error.message);
    res.status(500).json({ mensaje: "Error registrando usuario" });
  }
};

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

// ---------------- CREAR SEDE ----------------
export const createSede = async (req, res) => {
  try {
    const { nombre, direccion } = req.body;
    if (!nombre || !direccion)
      return res.status(400).json({ success: false, message: "Faltan datos" });

    const { rows } = await pool.query(
      "INSERT INTO sedes (nombre, direccion) VALUES ($1, $2) RETURNING id_sede, nombre, direccion",
      [nombre, direccion]
    );

    res.json({ success: true, sede: rows[0] });
  } catch (err) {
    console.error("Error en createSede:", err);
    res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};

// ---------------- LISTAR SEDES ----------------
export const getSedes = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id_sede, nombre, direccion FROM sedes ORDER BY id_sede");
    res.json(rows);
  } catch (err) {
    console.error("Error en getSedes:", err);
    res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};

// ---------------- LOGIN USUARIO ----------------
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Faltan credenciales" });
    }

    // Buscar usuario por correo
    const query = `SELECT * FROM usuarios WHERE email = $1`;
    const { rows } = await pool.query(query, [email]);

    if (rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Usuario no encontrado" });
    }

    const user = rows[0];

    // Comparar contraseñas
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Contraseña incorrecta" });
    }

    // Crear token JWT
    const token = jwt.sign(
      {
        id: user.id, // 👈 cambia si tu PK es id_usuario
        email: user.email,
        rol_id: user.rol_id,
        sede_id: user.sede_id,
      },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "2h" }
    );

    // Responder
    res.json({
      success: true,
      message: "Login exitoso",
      token,
      user: {
        id: user.id, // o user.id_usuario
        nombre: user.nombre,
        apellidos: user.apellidos,
        email: user.email,
        rol_id: user.rol_id,
        sede_id: user.sede_id,
      },
    });
  } catch (err) {
    console.error("Error en loginUser:", err);
    res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};


// ---------------- GET USERS ----------------
export const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellidos, u.dni, u.email, 
              r.nombre AS rol, s.nombre AS sede, u.qr_code
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id_rol
       JOIN sedes s ON u.sede_id = s.id_sede
       ORDER BY u.id_usuario ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error en getUsers:", error);
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
};

// Eliminar usuario

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params; // viene de la URL /users/:id

    // Eliminamos el usuario
    const result = await pool.query(
      "DELETE FROM usuarios WHERE id_usuario = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Respuesta con el usuario eliminado
    res.json({
      message: "✅ Usuario eliminado correctamente",
      usuario: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error al eliminar usuario:", err.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Actualizar usuario
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params; // viene de la URL /users/:id
    const { nombre, apellidos, dni, email, rol_id, sede_id } = req.body;

    const result = await pool.query(
      `UPDATE usuarios 
       SET nombre = $1, apellidos = $2, dni = $3, email = $4, rol_id = $5, sede_id = $6 
       WHERE id_usuario = $7 RETURNING *`,
      [nombre, apellidos, dni, email, rol_id, sede_id, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({ message: "Usuario actualizado correctamente", usuario: result.rows[0] });
  } catch (err) {
    console.error("❌ Error al actualizar usuario:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// ----------------- MARCAR ASISTENCIA -----------------

export const marcarAsistencia = async (req, res) => {
  try {
    const { id_usuario, qr_code, ubicacion } = req.body;
    // aceptar tanto id_usuario (front) como qr_code por compatibilidad
    const userId = id_usuario || qr_code;

    console.log("📥 Petición recibida en /asistencia/marcar");
    console.log("👉 Datos recibidos:", { id_usuario, qr_code, ubicacion });

    if (!userId) {
      console.warn("⚠️ Falta id_usuario o qr_code en el body");
      return res.status(400).json({ mensaje: "Falta id_usuario (o qr_code)" });
    }

    // 1) Buscar usuario (asumiendo que la tabla usuarios tiene columna id_usuario)
    const usuarioQ = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellidos, r.nombre AS rol
       FROM usuarios u
       LEFT JOIN roles r ON u.rol_id = r.id_rol
       WHERE u.id_usuario = $1`,
      [userId]
    );

    if (usuarioQ.rowCount === 0) {
      console.warn(`⚠️ Usuario con id ${userId} no encontrado`);
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const usuario = usuarioQ.rows[0];
    console.log("✅ Usuario encontrado:", usuario);

    // 2) Verificar si ya tiene registro hoy en 'asistencia' (tabla usa usuario_id)
    const hoy = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const asistenciaQ = await pool.query(
      `SELECT * FROM asistencia WHERE usuario_id = $1 AND fecha = $2`,
      [userId, hoy]
    );

    // 3) Si no existe → INSERT hora_entrada. Si existe y hora_salida null → UPDATE hora_salida.
    if (asistenciaQ.rowCount === 0) {
      // Registrar ENTRADA
      const insertRes = await pool.query(
        `INSERT INTO asistencia (usuario_id, fecha, hora_entrada, estado)
         VALUES ($1, $2, NOW(), 'Presente') RETURNING *`,
        [userId, hoy]
      );

      console.log("✅ Entrada registrada en DB:", insertRes.rows[0]);
      return res.json({
        mensaje: "✅ Entrada registrada correctamente",
        usuario,
        asistencia: insertRes.rows[0],
      });
    } else {
      const registro = asistenciaQ.rows[0];

      if (!registro.hora_salida) {
        // Registrar SALIDA
        const updateRes = await pool.query(
          `UPDATE asistencia
           SET hora_salida = NOW(), estado = 'Salida'
           WHERE usuario_id = $1 AND fecha = $2
           RETURNING *`,
          [userId, hoy]
        );

        console.log("✅ Salida registrada en DB:", updateRes.rows[0]);
        return res.json({
          mensaje: "✅ Salida registrada correctamente",
          usuario,
          asistencia: updateRes.rows[0],
        });
      } else {
        console.log("⚠️ El usuario ya registró entrada y salida hoy:", registro);
        return res.status(200).json({
          mensaje: "⚠️ Ya registraste entrada y salida hoy",
          usuario,
          asistencia: registro,
        });
      }
    }
  } catch (err) {
    console.error("🔥 Error en marcarAsistencia:", err);
    // log completo para la terminal
    console.error(err.stack || err);
    return res.status(500).json({
      mensaje: "Error interno al registrar asistencia",
      error: err.message,
    });
  }
};