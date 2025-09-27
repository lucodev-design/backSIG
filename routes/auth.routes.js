// routes/auth.routes.js
import { Router } from "express";
import {
  registerUser,
  createRol,
  createSede,
  getRoles,
  getSedes,
  loginUser,
  getUsers, 
  updateUser,
  deleteUser
} from "../controllers/auth.controllers.js";

const router = Router();

// Para la Gestion de usuarios
// ROLES
router.get("/roles", getRoles);
// SEDES
router.get("/sedes", getSedes );

// ====== rutas para la fase de insersion de registros de prueba ======
// --- Usuarios ---
router.post("/register", registerUser);
// --- Roles y Sedes ---
router.post("/roles", createRol);   // crear nuevo rol
router.post("/sedes", createSede);  // crear nueva sede

// ==== LOGIN ====
router.post("/login", loginUser);

// === LISTAR USUARIOS ===
router.get("/users", getUsers);

// === EDITAR Y ELIMINAR USUARIO ===
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);


export default router;
