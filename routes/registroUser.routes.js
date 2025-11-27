import { Router } from "express";
import { registerUser, getUsers,   updateUser,  deleteUser, } from "../controllers/registroUserController.js";          

const router = Router();

// Registro de Nuevos usuarios
router.post("/registerUser", registerUser);
// === LISTAR USUARIOS ===
router.get("/users", getUsers);

// === EDITAR Y ELIMINAR USUARIO ===
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

export default router;