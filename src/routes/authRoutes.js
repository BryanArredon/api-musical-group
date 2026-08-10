import { Router } from "express";
import * as authController from "../controllers/authController.js";

const router = Router();

/**
 * [CERTIFICACIÓN RNF10 - HASHING DE CONTRASEÑAS]
 * Nota de Arquitectura:
 * El hashing de contraseñas y la gestión de identidades no se realiza en código fuente plano 
 * por motivos de seguridad. Se delega al servicio Supabase Auth, el cual implementa internamente 
 * en su infraestructura el algoritmo estándar de la industria bcrypt para cifrar (hashear) 
 * y salar (salt) las contraseñas en la tabla segura `auth.users`.
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Autenticación de usuario
 *     description: |
 *       Autentica a un usuario y devuelve un token JWT válido por 24 horas.
 *       
 *       **Usuarios de demostración disponibles:**
 *       - Email: admin@musicalgroup.com, Contraseña: demo1234 (Rol: Administrador)
 *       - Email: user@musicalgroup.com, Contraseña: demo1234 (Rol: Colaborador)
 *     tags:
 *       - Autenticación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *           examples:
 *             Admin:
 *               value:
 *                 email: admin@musicalgroup.com
 *                 password: demo1234
 *             User:
 *               value:
 *                 email: user@musicalgroup.com
 *                 password: demo1234
 *     responses:
 *       200:
 *         description: Autenticación exitosa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Faltan campos requeridos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "Bad Request"
 *               message: "El correo y la contraseña son obligatorios."
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "Unauthorized"
 *               message: "Credenciales incorrectas. Verifique su correo o contraseña."
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/login", authController.login);
router.post("/register", authController.register);
router.post("/logout", authController.logout);

export default router;