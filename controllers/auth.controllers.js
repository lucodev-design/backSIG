// auth.controller.js
import pool from "../db/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// ---- LOGIN (ya lo tienes) ----
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

    res.json({ token, user: { id: user.id, email: user.email, rol: user.rol } });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// ---- REGISTER (nuevo) ----
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

    // Guardar en la BD
    const result = await pool.query(
      "INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol",
      [nombre, email, hashedPassword, rol]
    );

    res.status(201).json({
      message: "Usuario registrado correctamente ✅",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error en register:", error.message);
    res.status(500).json({ message: "Error al registrar usuario" });
  }
};
