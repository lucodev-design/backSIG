// routes/reportesUser.routes.js
import express from 'express';
import {
  getUltimoReporteUsuario,
  guardarReporte,
  getReportesUsuario,
  getTodosReportes,
  eliminarReporte
} from '../controllers/reportesUserControllers.js';

const router = express.Router();

router.get('/ultimo/:id_usuario', getUltimoReporteUsuario);

router.post('/', guardarReporte);

router.get('/usuario/:id_usuario', getReportesUsuario);

router.get('/', getTodosReportes);

router.delete('/:id_reporte', eliminarReporte);

export default router;