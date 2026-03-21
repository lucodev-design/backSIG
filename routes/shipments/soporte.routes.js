import express from "express";
import {
  enviarSoporte,
  getSoportes,
  updateSoporte,
  deleteSoporte, //  nuevo
} from "../../controllers/shipments/soporte.controller.js";

const router = express.Router();

router.post("/soporte", enviarSoporte);
router.get("/listar", getSoportes);
router.put("/soporte/:id", updateSoporte);
router.delete("/soporte/:id", deleteSoporte); //  nueva ruta

export default router;