import { Router } from "express";
import { loginSuperAdmin } from "../controllers/authSuperAdminController.js";

const router = Router();

// Ruta del login superadmin
router.post("/login-superadmin", loginSuperAdmin);

export default router;
