// controllers/ticketsController.js
import pool from "../db/db.js";

// ── Generar ticket ────────────────────────────────────────────
export const generarTicket = async (req, res) => {
  const { id_usuario } = req.params;

  try {
    // Datos del usuario
    const { rows: usuarios } = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellidos, u.remuneracion,
              s.nombre AS sede, t.nombre_turno AS turno
       FROM usuarios u
       LEFT JOIN sedes s ON u.sede_id = s.id_sede
       LEFT JOIN turnos t ON u.turno_id = t.id_turno
       WHERE u.id_usuario = $1`,
      [id_usuario]
    );

    if (usuarios.length === 0)
      return res.status(404).json({ message: "Usuario no encontrado." });

    const usuario = usuarios[0];

    if (!usuario.remuneracion || usuario.remuneracion <= 0)
      return res.status(400).json({ message: "El usuario no tiene remuneración asignada." });

    // ✅ Fecha del último ticket generado (null si no hay ninguno)
    const { rows: ultimoTicket } = await pool.query(
      `SELECT fecha_emision FROM tickets_remuneracion
       WHERE id_usuario = $1
       ORDER BY fecha_emision DESC
       LIMIT 1`,
      [id_usuario]
    );

    const fechaDesde = ultimoTicket.length > 0
      ? ultimoTicket[0].fecha_emision
      : null; // Si no hay ticket previo, toma todas las asistencias

    // ✅ Sumar descuentos del período
    const { rows: descuentos } = await pool.query(
      fechaDesde
        ? `SELECT COALESCE(SUM(descuento), 0) AS total_descuentos
           FROM asistencia
           WHERE usuario_id = $1
             AND fecha > $2`
        : `SELECT COALESCE(SUM(descuento), 0) AS total_descuentos
           FROM asistencia
           WHERE usuario_id = $1`,
      fechaDesde ? [id_usuario, fechaDesde] : [id_usuario]
    );

    const total_descuentos = parseFloat(descuentos[0].total_descuentos);
    const monto_bruto      = parseFloat(usuario.remuneracion);
    const monto_neto       = Math.max(0, monto_bruto - total_descuentos); // nunca negativo

    // Código único
    const fechaStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random   = Math.floor(1000 + Math.random() * 9000);
    const codigo_ticket = `TICK-${fechaStr}-${random}`;

    // ✅ Guardar con monto_bruto, total_descuentos y monto (neto)
    const { rows } = await pool.query(
      `INSERT INTO tickets_remuneracion 
         (id_usuario, codigo_ticket, monto, monto_bruto, total_descuentos)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id_usuario, codigo_ticket, monto_neto, monto_bruto, total_descuentos]
    );

    res.status(201).json({
      ticket: rows[0],
      usuario: {
        nombre:           usuario.nombre,
        apellidos:        usuario.apellidos,
        sede:             usuario.sede,
        turno:            usuario.turno,
        monto_bruto,
        total_descuentos,
        monto_neto,
      },
    });
  } catch (error) {
    console.error("❌ Error generando ticket:", error);
    // 
    console.log("🧮 monto_bruto:", monto_bruto);
    console.log("🧮 total_descuentos:", total_descuentos);
    console.log("🧮 monto_neto:", monto_neto);
    // 
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// ── Obtener tickets del usuario ───────────────────────────────
export const getMisTickets = async (req, res) => {
  const { id_usuario } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT t.*, u.nombre, u.apellidos, s.nombre AS sede, tu.nombre_turno AS turno
       FROM tickets_remuneracion t
       JOIN usuarios u ON t.id_usuario = u.id_usuario
       LEFT JOIN sedes s ON u.sede_id = s.id_sede
       LEFT JOIN turnos tu ON u.turno_id = tu.id_turno
       WHERE t.id_usuario = $1
       ORDER BY t.fecha_emision DESC`,
      [id_usuario]
    );

    res.json(rows);
  } catch (error) {
    console.error("❌ Error obteniendo tickets:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// ── Enviar ticket al admin ────────────────────────────────────
export const enviarTicket = async (req, res) => {
  const { id_ticket } = req.params;

  try {
    const { rows } = await pool.query(
      `UPDATE tickets_remuneracion
       SET estado = 'enviado', visto_admin = FALSE
       WHERE id_ticket = $1
       RETURNING *`,
      [id_ticket]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Ticket no encontrado." });

    res.json({ message: "Ticket enviado al administrador.", ticket: rows[0] });
  } catch (error) {
    console.error("❌ Error enviando ticket:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// ── Admin: obtener todos los tickets enviados ─────────────────
export const getTicketsAdmin = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.id_ticket, t.codigo_ticket, t.monto, t.estado,
              t.fecha_emision, t.fecha_accion, t.visto_admin,
              u.nombre, u.apellidos,
              s.nombre AS sede,
              tu.nombre_turno AS turno
       FROM tickets_remuneracion t
       JOIN usuarios u ON t.id_usuario = u.id_usuario
       LEFT JOIN sedes s ON u.sede_id = s.id_sede
       LEFT JOIN turnos tu ON u.turno_id = tu.id_turno
       WHERE t.estado IN ('enviado', 'pagado', 'en_espera')
       ORDER BY t.fecha_emision ASC`,
    );

    res.json(rows);
  } catch (error) {
    console.error("❌ Error obteniendo tickets admin:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// ── Admin: contar tickets no vistos (notificación) ────────────
export const contarTicketsNuevos = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS total
       FROM tickets_remuneracion
       WHERE estado = 'enviado' AND visto_admin = FALSE`
    );

    res.json({ total: parseInt(rows[0].total) });
  } catch (error) {
    console.error("❌ Error contando tickets:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// ── Admin: marcar todos como vistos ──────────────────────────
export const marcarTicketsVistos = async (req, res) => {
  try {
    await pool.query(
      `UPDATE tickets_remuneracion SET visto_admin = TRUE
       WHERE estado = 'enviado' AND visto_admin = FALSE`
    );

    res.json({ message: "Tickets marcados como vistos." });
  } catch (error) {
    console.error("❌ Error marcando vistos:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// ── Admin: cambiar estado (pagado / en_espera) ────────────────
export const actualizarEstadoTicket = async (req, res) => {
  const { id_ticket } = req.params;
  const { estado } = req.body;

  const estadosPermitidos = ["pagado", "en_espera", "enviado"];
  if (!estadosPermitidos.includes(estado))
    return res.status(400).json({ message: "Estado no válido." });

  try {
    const { rows } = await pool.query(
      `UPDATE tickets_remuneracion
       SET estado = $1, fecha_accion = NOW()
       WHERE id_ticket = $2
       RETURNING *`,
      [estado, id_ticket]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Ticket no encontrado." });

    res.json({ message: "Estado actualizado.", ticket: rows[0] });
  } catch (error) {
    console.error("❌ Error actualizando estado:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// ── Usuario: eliminar ticket propio (solo pendiente o enviado) ─
export const eliminarTicketUsuario = async (req, res) => {
  const { id_ticket } = req.params;
  const { id_usuario } = req.body; // para verificar que sea su ticket

  try {
    // Verificar que el ticket pertenece al usuario y tiene estado válido
    const { rows } = await pool.query(
      `SELECT * FROM tickets_remuneracion
       WHERE id_ticket = $1 AND id_usuario = $2`,
      [id_ticket, id_usuario]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Ticket no encontrado." });

    const ticket = rows[0];

    if (!["pendiente", "enviado"].includes(ticket.estado))
      return res.status(403).json({
        message: "No puedes eliminar un ticket pagado o en espera.",
      });

    await pool.query(
      `DELETE FROM tickets_remuneracion WHERE id_ticket = $1`,
      [id_ticket]
    );

    res.json({ message: "Ticket eliminado correctamente." });
  } catch (error) {
    console.error("❌ Error eliminando ticket:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// ── Admin: eliminar cualquier ticket ─────────────────────────
export const eliminarTicketAdmin = async (req, res) => {
  const { id_ticket } = req.params;

  try {
    const { rows } = await pool.query(
      `DELETE FROM tickets_remuneracion WHERE id_ticket = $1 RETURNING *`,
      [id_ticket]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Ticket no encontrado." });

    res.json({ message: "Ticket eliminado correctamente." });
  } catch (error) {
    console.error("❌ Error eliminando ticket admin:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};