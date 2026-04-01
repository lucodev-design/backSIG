import express from "express";
import {
  generarTicket,
  getMisTickets,
  enviarTicket,
  getTicketsAdmin,
  contarTicketsNuevos,
  marcarTicketsVistos,
  actualizarEstadoTicket,
  eliminarTicketUsuario, // ✅ nuevo
  eliminarTicketAdmin,   // ✅ nuevo
} from "../controllers/ticketsController.js";
import { verifyToken, verifyAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ── Rutas del trabajador ──────────────────────────────────────
router.post("/generar/:id_usuario",       verifyToken, generarTicket);
router.get("/mis-tickets/:id_usuario",    verifyToken, getMisTickets);
router.put("/enviar/:id_ticket",          verifyToken, enviarTicket);
router.delete("/eliminar/:id_ticket",     verifyToken, eliminarTicketUsuario); // ✅ nuevo

// ── Rutas del administrador ───────────────────────────────────
router.get("/admin/todos",                verifyToken, verifyAdmin, getTicketsAdmin);
router.get("/admin/nuevos/count",         verifyToken, verifyAdmin, contarTicketsNuevos);
router.put("/admin/vistos",               verifyToken, verifyAdmin, marcarTicketsVistos);
router.put("/admin/estado/:id_ticket",    verifyToken, verifyAdmin, actualizarEstadoTicket);
router.delete("/admin/eliminar/:id_ticket", verifyToken, verifyAdmin, eliminarTicketAdmin); // ✅ nuevo

export default router;