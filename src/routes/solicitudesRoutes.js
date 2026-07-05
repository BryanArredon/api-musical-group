import { Router } from "express";
import * as solicitudesController from "../controllers/solicitudesController.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

const router = Router();

// Collaborators can generate requests
router.post("/", requireAuth, solicitudesController.createSolicitud);

// Administrative operations
router.get("/pendientes", requireAdmin, solicitudesController.getPendingSolicitudes);
router.post("/:id/aprobar", requireAdmin, solicitudesController.aprobarSolicitud);
router.post("/:id/rechazar", requireAdmin, solicitudesController.rejectSolicitud);

export default router;
