import pool from "../db/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import QRCode from "qrcode"; // 👈 librería para generar QR

// ---- LOGIN ----
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ mensaje: "Faltan datos" });
    }

    const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ mensaje: "Usuario no encontrado" });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ mensaje: "Contraseña incorrecta" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.rol },
      process.env.JWT_SECRET || "secreto123",
      { expiresIn: "1h" }
    );

    res.json({
      mensaje: "Login exitoso ✅",
      token,
      user: { id: user.id, email: user.email, rol: user.rol },
    });
  } catch (error) {
    console.error("❌ Error en login:", error.message);
    res.status(500).json({ mensaje: "Error en el servidor" });
  }
};

// ---- REGISTER ----
export const register = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ mensaje: "Faltan datos" });
    }

    // Verificar si ya existe el correo
    const checkUser = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ mensaje: "El correo ya está registrado" });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Guardar en la BD
    const result = await pool.query(
      "INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol",
      [nombre, email, hashedPassword, rol]
    );

    const newUser = result.rows[0];

    // ✅ Generar código QR con ID y Email
    const qrData = JSON.stringify({ id: newUser.id, email: newUser.email });
    const qrCode = await QRCode.toDataURL(qrData);

    res.status(201).json({
      mensaje: "Usuario registrado correctamente ✅",
      user: newUser,
      qrCode, // 👈 enviamos el QR al frontend
    });
  } catch (error) {
    console.error("❌ Error en register:", error.message);
    res.status(500).json({ mensaje: "Error al registrar usuario" });
  }
};

// ---- LISTAR USUARIOS ----
export const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre, email, rol, created_at FROM usuarios ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener usuarios:", error.message);
    res.status(500).json({ mensaje: "Error al obtener usuarios" });
  }
};
