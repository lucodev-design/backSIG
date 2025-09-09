import express from "express";
import { login, register, getUsers } from "../controllers/auth.controllers.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.get("/users", getUsers); // 👈 nueva ruta para listar usuarios

export default router;
