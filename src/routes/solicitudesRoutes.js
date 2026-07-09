import { Router } from "express";
import * as solicitudesController from "../controllers/solicitudesController.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

const router = Router();

/**
 * @swagger
 * /api/solicitudes:
 *   post:
 *     summary: Crear solicitud de activo
 *     description: |
 *       Crea una nueva solicitud de préstamo de un activo.
 *       Disponible para colaboradores autenticados.
 *     tags:
 *       - Solicitudes
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSolicitudRequest'
 *           example:
 *             activoId: 1
 *             comentarios: "Necesito esta guitarra para el próximo concierto"
 *     responses:
 *       201:
 *         description: Solicitud creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Solicitud de activo generada exitosamente."
 *                 data:
 *                   $ref: '#/components/schemas/Solicitud'
 *       400:
 *         description: Faltan campos requeridos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "Bad Request"
 *               message: "El campo activoId es obligatorio."
 *       401:
 *         description: Token no proporcionado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", requireAuth, solicitudesController.createSolicitud);

/**
 * @swagger
 * /api/solicitudes/pendientes:
 *   get:
 *     summary: Obtener solicitudes pendientes
 *     description: |
 *       Obtiene todas las solicitudes pendientes de aprobación.
 *       Solo disponible para administradores.
 *     tags:
 *       - Solicitudes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de solicitudes pendientes obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Solicitud'
 *       401:
 *         description: Token no proporcionado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Acceso denegado - Se requiere rol de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/pendientes", requireAdmin, solicitudesController.getPendingSolicitudes);

/**
 * @swagger
 * /api/solicitudes/todas:
 *   get:
 *     summary: Obtener todas las solicitudes
 *     description: Obtiene todas las solicitudes (pendientes, aprobadas, rechazadas). Solo para administradores.
 *     tags:
 *       - Solicitudes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de todas las solicitudes
 */
router.get("/todas", requireAdmin, solicitudesController.getAllSolicitudes);

/**
 * @swagger
 * /api/solicitudes/mis-solicitudes:
 *   get:
 *     summary: Obtener solicitudes del usuario actual
 *     description: Obtiene todas las solicitudes realizadas por el usuario autenticado.
 *     tags:
 *       - Solicitudes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de solicitudes del usuario
 */
router.get("/mis-solicitudes", requireAuth, solicitudesController.getUserSolicitudes);

/**
 * @swagger
 * /api/solicitudes/{id}/aprobar:
 *   post:
 *     summary: Aprobar solicitud
 *     description: |
 *       Aprueba una solicitud de préstamo de activo.
 *       Al aprobar, el estado del activo se cambia a "en_uso".
 *       Solo disponible para administradores.
 *     tags:
 *       - Solicitudes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la solicitud a aprobar
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Solicitud aprobada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Solicitud aprobada con éxito. El estado del activo ha cambiado automáticamente."
 *       401:
 *         description: Token no proporcionado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Acceso denegado - Se requiere rol de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Solicitud no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/:id/aprobar", requireAdmin, solicitudesController.aprobarSolicitud);

/**
 * @swagger
 * /api/solicitudes/{id}/rechazar:
 *   post:
 *     summary: Rechazar solicitud
 *     description: |
 *       Rechaza una solicitud de préstamo de activo.
 *       El estado del activo permanece sin cambios.
 *       Solo disponible para administradores.
 *     tags:
 *       - Solicitudes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la solicitud a rechazar
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Solicitud rechazada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Solicitud rechazada con éxito. El activo permanece sin cambios."
 *       401:
 *         description: Token no proporcionado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Acceso denegado - Se requiere rol de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Solicitud no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/:id/rechazar", requireAdmin, solicitudesController.rejectSolicitud);

export default router;
