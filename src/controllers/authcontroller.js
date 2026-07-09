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
        // Consultar el usuario desde la base de datos
        const result = await pool.query("SELECT id, nombre, email, password FROM usuarios WHERE email = $1", [email]);
        
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

        // Determinar rol (admin si contiene 'admin' para simular permisos, sino user)
        let role = "user";
        if (user.email.includes("admin")) {
            role = "admin";
        }
        const authorities = role === "admin" ? ["ROLE_ADMIN"] : ["ROLE_USER"];

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

        return res.status(200).json({
            success: true,
            message: "Inicio de sesión exitoso.",
            data: {
                token,
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

    try {
        // Verificar si el usuario ya existe
        const checkUser = await pool.query("SELECT id FROM usuarios WHERE email = $1", [email]);
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

        // Guardar el nuevo usuario en la BD
        const result = await pool.query(
            "INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id, nombre, email",
            [nombre, email, hashedPassword]
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