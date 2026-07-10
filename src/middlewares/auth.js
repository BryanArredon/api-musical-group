import jwt from "jsonwebtoken";

// Extrae el token desde la cookie HttpOnly (método principal)
// o desde el header Authorization como alternativa de compatibilidad.
function extractToken(req) {
    if (req.cookies && req.cookies.token) {
        return req.cookies.token;
    }
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.split(" ")[1];
    }
    return null;
}

export function requireAdmin(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({
            success: false,
            error: "Unauthorized",
            message: "Se requiere un token de acceso válido."
        });
    }

    try {
        const secret = process.env.JWT_SECRET || "8a9b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b";
        const decoded = jwt.verify(token, secret);
        
        // Check for ROLE_ADMIN role in the authorities claim
        const authorities = decoded.authorities || [];
        const isAdmin = authorities.includes("ROLE_ADMIN");
        
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                error: "Forbidden",
                message: "No tiene privilegios suficientes para realizar esta acción. Se requiere rol de Administrador."
            });
        }
        
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: "Unauthorized",
            message: "Token inválido o expirado."
        });
    }
}

export function requireAuth(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({
            success: false,
            error: "Unauthorized",
            message: "Se requiere un token de acceso válido."
        });
    }

    try {
        const secret = process.env.JWT_SECRET || "8a9b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b";
        const decoded = jwt.verify(token, secret);
        
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: "Unauthorized",
            message: "Token inválido o expirado."
        });
    }
}
