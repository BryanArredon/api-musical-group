import jwt from "jsonwebtoken";

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
        let role = null;
        let name = "";

        // Standard demo accounts validation (LGPDPPSO security testbed)
        if (email === "admin@musicalgroup.com" && password === "demo1234") {
            role = "admin";
            name = "Administrador del Sistema";
        } else if (email === "user@musicalgroup.com" && password === "demo1234") {
            role = "user";
            name = "Colaborador de Banda";
        } else {
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
                message: "Credenciales incorrectas. Verifique su correo o contraseña."
            });
        }

        const authorities = role === "admin" ? ["ROLE_ADMIN"] : ["ROLE_USER"];

        // Sign JWT token
        const token = jwt.sign(
            {
                sub: email,
                correo: email,
                nombre: name,
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
                    email,
                    nombre: name,
                    role: role,
                    authorities: authorities
                }
            }
        });
    } catch (error) {
        next(error);
    }
}