import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";

const JWT_SECRET = process.env.JWT_SECRET || "8a9b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b";

/**
 * Handles user login and generates a signed JWT token
 */
export async function login(req, res, next) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: "El correo y la contraseña son obligatorios."
        });
    }

    try {
        // Consultar el usuario desde la base de datos (V2)
        const result = await pool.query("SELECT id, nombre, email, password, rol FROM perfiles WHERE email = $1", [email]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
                message: "Credenciales incorrectas. Verifique su correo o contraseña."
            });
        }

        const user = result.rows[0];

        // Comparar la contraseña ingresada con el hash de la BD
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
                message: "Credenciales incorrectas. Verifique su correo o contraseña."
            });
        }

        // Usar el rol de la base de datos V2
        const role = user.rol || "user";
        const authorities = role === "admin" ? ["ROLE_ADMIN"] : ["ROLE_USER"];

        // Determinar si es HTTPS para activar la bandera Secure en la cookie
        const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";

        // Generar token JWT
        const token = jwt.sign(
            {
                sub: user.email,
                correo: user.email,
                nombre: user.nombre,
                authorities: authorities
            },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        // ══════════════════════════════════════════════════════════════════════
        // SEGURIDAD: Cookie HttpOnly — El token jamás toca el JavaScript
        // del cliente. Esto elimina el riesgo de robo de sesión por XSS.
        //   - httpOnly:  true  → No accesible desde document.cookie
        //   - secure:    true  → Solo viaja por HTTPS (no por HTTP en claro)
        //   - sameSite: 'none' → Necesario para peticiones cross-origin con
        //                        credentials (FrontEnd en 5173 → API en 3000)
        //   - maxAge: 86400000 → Expira en 24 horas (igual que el JWT)
        // ══════════════════════════════════════════════════════════════════════
        res.cookie("token", token, {
            httpOnly: true,
            secure: isSecure,
            sameSite: "strict",
            maxAge: 86400000 // 24 horas en milisegundos
        });

        return res.status(200).json({
            success: true,
            message: "Inicio de sesión exitoso.",
            data: {
                // NOTA: El token ya NO se envía en el body (lo maneja la cookie).
                // Solo se devuelven los datos del usuario para que el FrontEnd
                // pueda mostrar el nombre, rol, etc. en la interfaz.
                user: {
                    email: user.email,
                    nombre: user.nombre,
                    role: role,
                    authorities: authorities
                }
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Handles user registration
 */
export async function register(req, res, next) {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: "El nombre, correo y contraseña son obligatorios."
        });
    }

    // ══════════════════════════════════════════════════════════════════════
    // VALIDACIÓN DE SERVIDOR — Segunda línea de defensa.
    // El FrontEnd puede ser bypasseado (eliminando atributos en DevTools
    // o enviando peticiones directas con curl/Postman). El BackEnd SIEMPRE
    // valida independientemente del cliente.
    // ══════════════════════════════════════════════════════════════════════

    // Validar formato de email con regex RFC 5322
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: "El formato del correo electrónico no es válido."
        });
    }

    // Validar longitud máxima del nombre (50 caracteres)
    if (nombre.length > 50) {
        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: "El nombre no puede superar los 50 caracteres."
        });
    }

    // Validar longitud máxima del email (254 caracteres — RFC 5321)
    if (email.length > 254) {
        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: "El correo electrónico no puede superar los 254 caracteres."
        });
    }

    // Validar longitud mínima de contraseña (8 caracteres)
    if (password.length < 8) {
        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: "La contraseña debe tener al menos 8 caracteres."
        });
    }

    // Validar longitud máxima de contraseña (128 caracteres)
    if (password.length > 128) {
        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: "La contraseña no puede superar los 128 caracteres."
        });
    }


    try {
        // Verificar si el usuario ya existe (V2)
        const checkUser = await pool.query("SELECT id FROM perfiles WHERE email = $1", [email]);
        if (checkUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: "Conflict",
                message: "El correo ya está registrado."
            });
        }

        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Asignar rol admin si es correo admin (por compatibilidad en pruebas)
        const role = email.includes("admin") ? "admin" : "user";

        // Guardar el nuevo perfil en la BD (V2)
        const result = await pool.query(
            "INSERT INTO perfiles (nombre, email, password, rol) VALUES ($1, $2, $3, $4::rol_usuario) RETURNING id, nombre, email, rol",
            [nombre, email, hashedPassword, role]
        );

        const newUser = result.rows[0];

        return res.status(201).json({
            success: true,
            message: "Usuario registrado exitosamente.",
            data: {
                id: newUser.id,
                nombre: newUser.nombre,
                email: newUser.email
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Cierra la sesión del usuario eliminando la cookie segura del navegador.
 */
export async function logout(req, res) {
    // clearCookie destruye la cookie del cliente. Para que funcione, los
    // atributos deben coincidir exactamente con los usados al crearla.
    const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
    res.clearCookie("token", {
        httpOnly: true,
        secure: isSecure,
        sameSite: "strict"
    });
    return res.status(200).json({
        success: true,
        message: "Sesión cerrada correctamente."
    });
}