// routes/asistenciaRoutes.js
// El registro de asistencias actual (CODIGO)
import express from "express"; //  Cambiado de require a import
import { marcarAsistencia, getAsistenciaByUser, getConteoDiario } from "../controllers/asistenciaController.js"; //  Cambiado a import y añadido '.js'

const router = express.Router();

router.post("/marcar", marcarAsistencia);
router.get("/marcar/asistencia/:id_usuario", getAsistenciaByUser);
router.get("/conteo-diario/:fecha", getConteoDiario);

export default router;