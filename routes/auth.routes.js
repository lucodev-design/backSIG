import express from "express";
import { login, register, getUsers, marcarAsistencia } from "../controllers/auth.controllers.js";

const router = express.Router();

// Autenticación y usuarios
router.post("/login", login);
router.post("/register", register);
router.get("/users", getUsers);

// Asistencia (QR)
router.post("/asistencia/marcar", marcarAsistencia);

export default router;
