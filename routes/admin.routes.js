import { Router } from "express";
import { createAdmin, getAdmins, updateAdmin, deleteAdmin } from "../controllers/adminController.js";

const router = Router();

router.post("/admins", createAdmin);
router.get("/admins", getAdmins);
router.put("/admins/:id", updateAdmin);
router.delete("/admins/:id", deleteAdmin);

export default router;
