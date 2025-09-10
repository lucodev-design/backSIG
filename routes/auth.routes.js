import express from "express";
import { login, register, getUsers, marcarAsistencia, deleteUser } from "../controllers/auth.controllers.js";
import { verifyAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Autenticación y usuarios
router.post("/login", login);
router.post("/register", register);
router.get("/users", getUsers);

// Asistencia (QR)
router.post("/asistencia/marcar", marcarAsistencia);

// Ruta par eliminar a un usuario
router.delete("/user/:id", verifyAdmin, deleteUser)

export default router;
