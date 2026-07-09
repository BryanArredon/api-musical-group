import { auditLog } from "../utils/logger.js";
import { scanObjectForInjection } from "../utils/securityValidation.js";

/**
 * BOLA Protection Middleware
 *
 * Prevents Broken Object Level Authorization (OWASP API1:2023).
 * Ensures a non-admin user can only access resources that belong to them.
 * Admin users bypass this check and can access any resource.
 *
 * Usage: place this middleware after requireAuth on any route that
 * returns per-user data identified by a URL parameter.
 *
 * @param {Function} getOwnerEmail - async function(id) that returns the
 *   email of the resource owner from the database, or null if not found.
 *
 * Example:
 *   router.get("/:id", requireAuth, bolaGuard(getActivoOwnerEmail), controller)
 */
export function bolaGuard(getOwnerEmail) {
    return async (req, res, next) => {
        const { id } = req.params;
        const requestingEmail = req.user?.sub || req.user?.correo;
        const authorities = req.user?.authorities || [];
        const isAdmin = authorities.includes("ROLE_ADMIN");

        // Admins have access to all resources
        if (isAdmin) return next();

        try {
            const ownerEmail = await getOwnerEmail(id);

            if (ownerEmail === null) {
                // Resource does not exist — let the controller handle 404
                return next();
            }

            if (ownerEmail !== requestingEmail) {
                // Log attempted BOLA
                auditLog(requestingEmail, "BOLA_ATTEMPT_BLOCKED", {
                    attemptedId: id,
                    resourceOwner: ownerEmail
                });
                return res.status(403).json({
                    success: false,
                    error: "Forbidden",
                    message: "No tienes permiso para acceder a este recurso."
                });
            }

            next();
        } catch (err) {
            next(err);
        }
    };
}

/**
 * Request Body Injection Scanner Middleware
 *
 * Scans all string values in req.body for SQL, NoSQL, and XSS injection
 * patterns before they reach any controller or service layer.
 * (OWASP API8:2023 - Security Misconfiguration / Injection)
 */
export function injectionScanner(req, res, next) {
    if (!req.body || Object.keys(req.body).length === 0) return next();

    const result = scanObjectForInjection(req.body);
    if (!result.safe) {
        const userEmail = req.user?.sub || req.user?.correo || "ANONYMOUS";
        auditLog(userEmail, "INJECTION_ATTEMPT_BLOCKED", {
            type: result.type,
            path: req.path,
            method: req.method
        });

        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: result.message
        });
    }

    next();
}
