// routes/auth.routes.js
import { Router } from "express";
import {  createSede,   getSedes, updateSede, deleteSede,  loginUser, 
  updateConfig,
  getFeriados,
  addFeriado,
  deleteFeriado,
  updateConfiguracionGlobal,
} from "../controllers/auth.controllers.js";


const router = Router();



// SEDES
router.post("/sedes", createSede);  // crear nueva sede
router.get("/sedes", getSedes );
router.put("/sedes/:id_sede", updateSede);
router.delete("/sedes/:id_sede", deleteSede);

// ====== rutas para la fase de insersion de registros de prueba ======

// ==== LOGIN ====
router.post("/login", loginUser);


// ==== ADMIN NORMAL ======

// router.get("/global", getConfig);
router.put("/globalUpdate", updateConfig);


router.get("/config/feriados", getFeriados);
router.post("/config/feriados", addFeriado);
router.delete("/config/feriados/:id", deleteFeriado);

// CONFIGURACIÓN GLOBAL
// router.get("/configuracion", getConfiguracionGlobal);
router.put("/configuracion", updateConfiguracionGlobal);



export default router;
