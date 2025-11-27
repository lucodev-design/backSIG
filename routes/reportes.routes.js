// backend/routes/reportesRoutes.js
import express from "express";
import {
  getReporteConsolidado,
  getReporteTrabajador,
  getGraficosDesempeno,
//   exportarExcel,
//   exportarPDF
} from "../controllers/reportesController.js";

const router = express.Router();

// Reportes
router.get("/consolidado", getReporteConsolidado);
router.get("/trabajador", getReporteTrabajador);

// Gráficos
router.get("/graficos/desempeno", getGraficosDesempeno);

// Exportaciones
// router.post("/export/excel", exportarExcel);
// router.post("/export/pdf", exportarPDF);

export default router;
