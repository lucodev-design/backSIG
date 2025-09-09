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
      { id: user.id, rol: user.rol },
      process.env.JWT_SECRET || "secreto123",
      { expiresIn: "1h" }
    );

    return res.json({
      message: "Login exitoso ✅",
      token,
      user: { id: user.id, email: user.email, rol: user.rol },
    });
  } catch (error) {
    console.error("❌ Error en login:", error);
    return res.status(500).json({ message: "Error en el servidor" });
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
    const checkUser = await pool.query("SELECT 1 FROM usuarios WHERE email = $1", [email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ message: "El correo ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const codigoQR = `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const result = await pool.query(
      "INSERT INTO usuarios (nombre, email, password, rol, codigo_qr) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, email, rol, codigo_qr",
      [nombre, email, hashedPassword, rol, codigoQR]
    );

    const user = result.rows[0];
    const qrImage = await QRCode.toDataURL(codigoQR);

    return res.status(201).json({
      message: "Usuario registrado correctamente ✅",
      user,
      qrImage,
    });
  } catch (error) {
    console.error("❌ Error en register:", error);
    return res.status(500).json({ message: "Error al registrar usuario" });
  }
};

// ---- LISTAR USUARIOS ----
export const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre, email, rol, codigo_qr, created_at FROM usuarios ORDER BY id ASC"
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener usuarios:", error);
    return res.status(500).json({ message: "Error al obtener usuarios" });
  }
};

// ---- MARCAR ASISTENCIA ----
export const marcarAsistencia = async (req, res) => {
  try {
    const { qr, ubicacion } = req.body;

    if (!qr) {
      return res.status(400).json({ mensaje: "QR inválido" });
    }

    const usuarioResult = await pool.query(
      "SELECT * FROM usuarios WHERE codigo_qr = $1",
      [qr]
    );

    if (usuarioResult.rows.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const user = usuarioResult.rows[0];
    const idUsuario = user.id;
    const hoy = new Date().toISOString().split("T")[0];

    // Revisar registro existente
    const registroResult = await pool.query(
      "SELECT * FROM asistencia WHERE usuario_id = $1 AND fecha = $2",
      [idUsuario, hoy]
    );

    if (registroResult.rows.length === 0) {
      // Registrar ENTRADA
      await pool.query(
        "INSERT INTO asistencia (usuario_id, fecha, hora_entrada, ubicacion) VALUES ($1, $2, NOW(), $3)",
        [idUsuario, hoy, ubicacion]
      );
      return res.json({
        mensaje: `Entrada registrada ✅ para ${user.nombre}`,
        usuario: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
      });
    }

    const registro = registroResult.rows[0];

    if (!registro.hora_salida) {
      // Registrar SALIDA
      await pool.query(
        "UPDATE asistencia SET hora_salida = NOW(), ubicacion = $1 WHERE id = $2",
        [ubicacion, registro.id]
      );
      return res.json({
        mensaje: `Salida registrada ✅ para ${user.nombre}`,
        usuario: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
      });
    }

    return res.json({ mensaje: "Ya registraste entrada y salida hoy." });
  } catch (error) {
    console.error("❌ Error en asistencia:", error);
    return res.status(500).json({ mensaje: "Error en el servidor" });
  }
};
