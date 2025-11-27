import express from "express";
import { createTurno, 
  getTurnos, 
  getTurnoById,
  updateTurno, 
  deleteTurno  } from "../controllers/turnos.controllers.js";

const router = express.Router();

router.post("/turnos", createTurno);           // Crear
router.get("/turnos", getTurnos);              // Listar todos
router.get("/turnos/:id", getTurnoById);       // Obtener uno
router.put("/turnos/:id", updateTurno);        // Actualizar ✅ NUEVO
router.delete("/turnos/:id", deleteTurno);     // Eliminar

export default router;