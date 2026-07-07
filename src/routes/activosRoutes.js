import { Router } from "express";
import * as activosController from "../controllers/activosController.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

const router = Router();

// GET routes: any authenticated user can read assets (needed to display available items in loan form)
// POST route: admin only (create new asset)

/**
 * @swagger
 * /api/activos:
 *   post:
 *     summary: Crear nuevo activo
 *     description: |
 *       Crea un nuevo activo en el sistema. Solo disponible para administradores.
 *       
 *       Campos requeridos: nombre, categoria, estado.
 *     tags:
 *       - Activos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAssetRequest'
 *           example:
 *             nombre: "Guitarra Eléctrica"
 *             categoria: "Instrumentos"
 *             estado: "disponible"
 *     responses:
 *       201:
 *         description: Activo creado exitosamente
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
 *                   example: "Activo registrado y guardado exitosamente de forma consistente."
 *                 data:
 *                   $ref: '#/components/schemas/Asset'
 *       400:
 *         description: Faltan campos requeridos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *   get:
 *     summary: Obtener todos los activos
 *     description: |
 *       Obtiene la lista completa de todos los activos del sistema.
 *       Solo disponible para administradores.
 *     tags:
 *       - Activos
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de activos obtenida exitosamente
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
 *                     $ref: '#/components/schemas/Asset'
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
router.post("/", requireAdmin, activosController.createAsset);
router.get("/", requireAuth, activosController.getAllAssets);

/**
 * @swagger
 * /api/activos/{id}:
 *   get:
 *     summary: Obtener activo por ID
 *     description: |
 *       Obtiene los detalles de un activo específico según su ID.
 *       Solo disponible para administradores.
 *     tags:
 *       - Activos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del activo a obtener
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Activo obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Asset'
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
 *         description: Activo no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "Not Found"
 *               message: "No se encontró ningún activo con el ID 1."
 *   put:
 *     summary: Actualizar activo
 *     description: |
 *       Actualiza los datos de un activo existente.
 *       Solo disponible para administradores.
 *     tags:
 *       - Activos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del activo a actualizar
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAssetRequest'
 *           example:
 *             nombre: "Guitarra Acústica"
 *             categoria: "Instrumentos"
 *             estado: "mantenimiento"
 *     responses:
 *       200:
 *         description: Activo actualizado exitosamente
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
 *                   example: "Activo actualizado exitosamente."
 *                 data:
 *                   $ref: '#/components/schemas/Asset'
 *       400:
 *         description: Faltan campos requeridos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *         description: Activo no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Eliminar activo
 *     description: |
 *       Elimina un activo del sistema.
 *       Solo disponible para administradores.
 *     tags:
 *       - Activos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del activo a eliminar
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Activo eliminado exitosamente
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
 *                   example: "Activo eliminado exitosamente."
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
 *         description: Activo no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", requireAuth, activosController.getAssetById);
router.put("/:id", requireAdmin, activosController.updateAsset);
router.delete("/:id", requireAdmin, activosController.deleteAsset);

export default router;
