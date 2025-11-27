// backend/controllers/authSuperAdminController.js
import pool from "../db/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const loginSuperAdmin = async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({
        success: false,
        message: "Faltan datos obligatorios (correo y contraseña)",
      });
    }

    // Buscar super admin en tabla admins
    const [rows] = await pool.query(
      "SELECT * FROM admins WHERE correo = ? AND activo = 1",
      [correo]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Correo o contraseña incorrectos",
      });
    }

    const admin = rows[0];

    // Comparar contraseña encriptada
    const validPassword = await bcrypt.compare(contrasena, admin.contrasena);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Correo o contraseña incorrectos",
      });
    }

    // Crear token
    const token = jwt.sign(
      { id: admin.id, rol: "superadmin" },
      process.env.JWT_SECRET,
      { expiresIn: "10h" }
    );

    res.json({
      success: true,
      message: "Inicio de sesión exitoso",
      token,
      admin: {
        id: admin.id,
        nombre: admin.nombre,
        apellidos: admin.apellidos,
        correo: admin.correo,
        rol: admin.rol, // superadmin, root, etc
        sede_id: admin.sede_id,
      },
    });
  } catch (error) {
    console.error("❌ Error en loginSuperAdmin:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};
