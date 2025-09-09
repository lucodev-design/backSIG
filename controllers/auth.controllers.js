// controllers/auth.controllers.js
import pool from "../db/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";

// ---- LOGIN ----
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.rol },
      process.env.JWT_SECRET || "secreto123",
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login exitoso ✅",
      token,
      user: { id: user.id, email: user.email, rol: user.rol },
    });

  } catch (error) {
    console.error("❌ Error en login:", error.message);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// ---- REGISTER ----
export const register = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    // Verificar si ya existe el correo
    const checkUser = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ message: "El correo ya está registrado" });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear código único para QR (ej: USR-123456)
    const codigoQR = `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Guardar en la BD
    const result = await pool.query(
      "INSERT INTO usuarios (nombre, email, password, rol, codigo_qr) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, email, rol, codigo_qr",
      [nombre, email, hashedPassword, rol, codigoQR]
    );

    const user = result.rows[0];

    // Generar QR en base64
    const qrImage = await QRCode.toDataURL(codigoQR);

    res.status(201).json({
      message: "Usuario registrado correctamente ✅",
      user,
      qrImage, // base64 que puedes mostrar o descargar en el front
    });

  } catch (error) {
    console.error("❌ Error en register:", error.message);
    res.status(500).json({ message: "Error al registrar usuario" });
  }
};

// ---- LISTAR USUARIOS ----
export const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre, email, rol, codigo_qr, created_at FROM usuarios ORDER BY id ASC"
    );

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener usuarios:", error.message);
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
};
