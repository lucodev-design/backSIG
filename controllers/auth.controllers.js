import pool from "../db/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// ---------------- REGISTRO USUARIO ----------------
export const registerUser = async (req, res) => {
  try {
    const { nombre, apellidos, dni, email, password, rol_id, sede_id } = req.body;

    if (!nombre || !apellidos || !dni || !email || !password || !rol_id || !sede_id) {
      return res.status(400).json({ success: false, message: "Faltan datos" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO usuarios (nombre, apellidos, dni, email, password, rol_id, sede_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id_usuario, nombre, email
    `;
    const values = [nombre, apellidos, dni, email, hashedPassword, rol_id, sede_id];

    const { rows } = await pool.query(query, values);

    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error("Error en registerUser:", err);
    res.status(500).json({ success: false, message: "Error en el servidor" });
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
