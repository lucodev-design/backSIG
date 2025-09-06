// routes/qr.routes.js
import express from "express";
import QRCode from "qrcode";
import pool from "../db/db.js";

const router = express.Router();

// 📌 Obtener QR de un usuario
router.get("/usuario/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await pool.query("SELECT * FROM usuarios WHERE id=$1", [id]);

    if (usuario.rows.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const qrData = usuario.rows[0].id.toString(); // o email si prefieres
    const qrImage = await QRCode.toDataURL(qrData);

    res.json({ nombre: usuario.rows[0].nombre, qr: qrImage });
  } catch (err) {
    console.error("❌ Error generando QR:", err.message);
    res.status(500).json({ mensaje: "Error generando QR" });
  }
});

export default router;
