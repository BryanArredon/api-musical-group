import rateLimit from "express-rate-limit";

/**
 * Global API Rate Limiter
 * Applies a generous limit to all API routes.
 * Protects against mass data scraping (OWASP API4:2023 - Unrestricted Resource Consumption).
 */
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,                  // 200 requests per IP per window
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        success: false,
        error: "Too Many Requests",
        message: "Has realizado demasiadas peticiones. Por favor, espera 15 minutos antes de intentar nuevamente."
    }
});

/**
 * Strict Auth Rate Limiter
 * Protects login and auth endpoints against brute force attacks.
 * OWASP API6:2023 - Unrestricted Access to Sensitive Business Flows.
 * Allows only 10 attempts per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // Only 10 login attempts per window
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Does not count successful logins
    message: {
        success: false,
        error: "Too Many Requests",
        message: "Demasiados intentos de autenticación. Tu IP ha sido bloqueada temporalmente por 15 minutos por razones de seguridad."
    }
});

/**
 * Bulk Read Rate Limiter
 * Stricter limit for list/collection endpoints to prevent bulk data extraction.
 * OWASP API3:2023 - Broken Object Property Level Authorization.
 */
export const listLimiter = rateLimit({
    windowMs: 60 * 1000,  // 1 minute
    max: 30,              // 30 requests per minute for list endpoints
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        success: false,
        error: "Too Many Requests",
        message: "Velocidad de consulta de datos excedida. Reduce la frecuencia de tus peticiones."
    }
});
