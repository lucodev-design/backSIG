import pool from "../../db/db.js";
import { transporter } from "../../config/shipments/mail.js";

export const enviarSoporte = async (req, res) => {
  const { email, mensaje } = req.body;

  await pool.query("INSERT INTO soporte (email, mensaje) VALUES ($1, $2)", [
    email,
    mensaje,
  ]);

  if (!email || !mensaje) {
    return res.status(400).json({
      error: "Datos incompletos",
    });
  }

  try {
    await transporter.sendMail({
      from: `"Soporte Sistema" <${process.env.MAIL_USER}>`,
      to: process.env.MAIL_USER, // Aqui es donde llegarán los mensajes
      replyto: email, // Correo del usuario
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
      msg: "Correo enviado correctamente",
    });
  } catch (error) {
    console.error("Error enviando correo:", error);
    return res.status(500).json({
      error: "Error al enviar el correo",
    });
  }
};

//  Obtener todos los mensajes
export const getSoportes = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM soporte ORDER BY fecha DESC",
    );

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error en getSoportes:", error);
    res.status(500).json({ error: "Error al obtener soportes" });
  }
};

//  Actualizar estado (pendiente / atendido)
export const updateSoporte = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  try {
    await pool.query("UPDATE soporte SET estado = $1 WHERE id = $2", [
      estado,
      id,
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error en updateSoporte:", error);
    res.status(500).json({ error: "Error al actualizar estado" });
  }
};
