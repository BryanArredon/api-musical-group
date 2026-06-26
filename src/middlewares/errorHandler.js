import { auditLog } from "../utils/logger.js";

export function errorHandler(err, req, res, next) {
    const userId = req.user ? req.user.correo : 'ANONYMOUS';
    
    // Log internal stack trace securely
    console.error(`[ERROR] ${err.message}`, err.stack);
    
    // Log to audit log
    auditLog(userId, "ERROR_OCCURRED", {
        message: err.message,
        path: req.path,
        method: req.method
    });
    
    // Determine status code
    const statusCode = err.status || 500;
    
    // Respond without leaking internal details
    res.status(statusCode).json({
        success: false,
        error: statusCode === 500 ? "Internal Server Error" : err.name || "Error",
        message: statusCode === 500 
            ? "Ha ocurrido un error interno en el servidor." 
            : err.message
    });
}
