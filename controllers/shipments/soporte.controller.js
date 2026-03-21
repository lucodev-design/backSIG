import pool from "../../db/db.js";
import { transporter } from "../../config/shipments/mail.js";

// Enviar mensaje de soporte
export const enviarSoporte = async (req, res) => {
  const { email, mensaje } = req.body;

  // ✅ Validación ANTES del INSERT
  if (!email || !mensaje) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  try {
    await pool.query("INSERT INTO soporte (email, mensaje) VALUES ($1, $2)", [
      email,
      mensaje,
    ]);

    await transporter.sendMail({
      from: `"Soporte Sistema" <${process.env.MAIL_USER}>`,
      to: process.env.MAIL_USER,
      replyTo: email, // ✅ corregido: era replyto (minúscula)
      subject: "Nuevo mensaje de soporte",
      html: `
        <h3>Nuevo mensaje de soporte</h3>
        <p><strong>Usuario:</strong> ${email}</p>
        <p><strong>Mensaje:</strong></p>
        <p>${mensaje}</p>
      `,
    });

    return res.json({
      success: true,
      message: "Mensaje enviado correctamente", // ✅ "message" para el frontend
    });
  } catch (error) {
    console.error("❌ Error en enviarSoporte:", error);
    return res.status(500).json({ error: "Error al enviar el mensaje" });
  }
};

// Obtener todos los mensajes
export const getSoportes = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM soporte ORDER BY fecha DESC");
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error en getSoportes:", error);
    res.status(500).json({ error: "Error al obtener soportes" });
  }
};

// Actualizar estado (pendiente / atendido)
export const updateSoporte = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  try {
    await pool.query("UPDATE soporte SET estado = $1 WHERE id = $2", [estado, id]);
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error en updateSoporte:", error);
    res.status(500).json({ error: "Error al actualizar estado" });
  }
};

// ✅ NUEVO — Eliminar soporte
export const deleteSoporte = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("DELETE FROM soporte WHERE id = $1 RETURNING id", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Mensaje no encontrado" });
    }

    res.json({ success: true, message: "Mensaje eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error en deleteSoporte:", error);
    res.status(500).json({ error: "Error al eliminar el mensaje" });
  }
};