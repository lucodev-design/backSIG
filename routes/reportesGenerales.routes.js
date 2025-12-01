// ====================================
// backend/routes/reportesGenerales.routes.js
// ====================================

import express from "express";
import {
  generarReporteConsolidado,
  generarReportePorSede,
  generarReportePorTrabajador,
  exportarReporteExcel,
  exportarReportePDF,
} from "../controllers/reportesGeneralesController.js";
import { verifyToken, verifyAdminOrSuperAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Todas las rutas requieren autenticación y permisos de admin
router.use(verifyToken);
router.use(verifyAdminOrSuperAdmin);

// Generar reportes
router.get("/consolidado", generarReporteConsolidado);
router.get("/por-sede", generarReportePorSede);
router.get("/por-trabajador", generarReportePorTrabajador);

// Exportar
router.post("/exportar/excel", exportarReporteExcel);
router.post("/exportar/pdf", exportarReportePDF);

export default router;