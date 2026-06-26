import jwt from "jsonwebtoken";

export function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            error: "Unauthorized",
            message: "Se requiere un token de acceso válido."
        });
    }

    const token = authHeader.split(" ")[1];
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
