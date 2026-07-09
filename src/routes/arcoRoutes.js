import { Router } from "express";
import * as arcoController from "../controllers/arcoController.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

/**
 * @swagger
 * /api/arco/acceso:
 *   get:
 *     summary: Ejercer Derecho de Acceso (ARCO)
 *     description: Permite a cualquier usuario autenticado descargar una copia de todos sus datos personales e historial en el sistema.
 *     tags:
 *       - ARCO (Privacidad)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos obtenidos correctamente
 */
router.get("/acceso", requireAuth, arcoController.getDerechoAcceso);

/**
 * @swagger
 * /api/arco/cancelacion:
 *   delete:
 *     summary: Ejercer Derecho de Cancelación (ARCO)
 *     description: Permite a cualquier usuario autenticado solicitar la eliminación de sus datos. Por motivos de integridad de inventario, los datos son anonimizados irreversiblemente.
 *     tags:
 *       - ARCO (Privacidad)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos anonimizados correctamente
 */
router.delete("/cancelacion", requireAuth, arcoController.solicitarCancelacion);

export default router;
