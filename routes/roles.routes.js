import { Router } from "express";
import { createRol, getRoles, updateRol, deleteRol } from "../controllers/rolesController.js";

const router = Router();

// ROLES
router.post("/rol", createRol);   // crear nuevo rol
router.get("/rol", getRoles);
router.put("/rol/:id_rol", updateRol);
router.delete("/rol/:id_rol", deleteRol);

export default router;