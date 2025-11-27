// backend/routes/confiGlobalRoutes.js
import { Router } from 'express';
import { getConfiguracionGlobal, updateConfiguracionGlobal } from '../controllers/confiGlobalController.js';
// Importa tu middleware de autenticación si lo usas (ej: verifyAdmin)

const router = Router();

// 💡 Nota: Usarás un nuevo endpoint para evitar conflictos con rutas antiguas.
router.get("/global", getConfiguracionGlobal);
router.put("/globalUpdate", updateConfiguracionGlobal); 

export default router;