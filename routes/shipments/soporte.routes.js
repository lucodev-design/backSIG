import express from "express";
import { enviarSoporte, getSoportes, updateSoporte } from "../../controllers/shipments/soporte.controller.js";

const router = express.Router();

router.post("/soporte", enviarSoporte);

// Listar Mensajes
router.get("/listar", getSoportes);

// Editar Cambiar estado
router.put("/soporte/:id", updateSoporte);

export default router;