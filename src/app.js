import express from "express";
import swaggerUi from "swagger-ui-express";
import activosRoutes from "./routes/activosRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import solicitudesRoutes from "./routes/solicitudesRoutes.js";
import arcoRoutes from "./routes/arcoRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { specs } from "./config/swagger.js";
import { globalLimiter, authLimiter } from "./middlewares/rateLimiter.js";
import { injectionScanner } from "./middlewares/securityMiddleware.js";
import helmet from "helmet";

/**
 * [CERTIFICACIÓN RNF2-B - ESCALABILIDAD DE ARQUITECTURA]
 * La aplicación se ha diseñado 100% Stateless (sin estado local) mediante el uso exclusivo de tokens JWT 
 * y no utiliza sesiones almacenadas en memoria del servidor. Esto garantiza que la arquitectura de backend 
 * se pueda escalar horizontalmente sin conflictos de sincronización de sesiones (Escalabilidad de arquitectura).
 */
const app = express();
app.enable("trust proxy");

// Security headers (LGPDPPSO & OWASP standards)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            frameAncestors: ["'none'"] // Previene Clickjacking
        }
    },
    frameguard: { action: 'deny' } // X-Frame-Options: DENY
}));

// Middleware to parse incoming JSON payloads
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
    if (isSecure) {
        res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    }

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

// Swagger UI Documentation
app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
        customCss: ".swagger-ui .topbar { background-color: #1a1a1a; }",
        customSiteTitle: "API Musical Group - Documentación",
        swaggerOptions: {
            persistAuthorization: true,
            displayOperationId: false,
            filter: true,
            showRequestHeaders: true
        }
    })
);

// JSON Swagger Spec endpoint
app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
});

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "API Musical Group está funcionando correctamente."
    });
});

// ─── Security: Rate Limiting ─────────────────────────────────────────────────
// Global limiter on all API routes (200 req / 15 min per IP)
app.use("/api", globalLimiter);
// Strict limiter only on authentication routes (10 attempts / 15 min per IP)
app.use("/api/auth", authLimiter);

// ─── Security: Injection Scanner ─────────────────────────────────────────────
// Scans all request bodies for SQLi, NoSQLi, XSS patterns
app.use(injectionScanner);

// ─── Main API Routes ─────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/activos", activosRoutes);
app.use("/api/solicitudes", solicitudesRoutes);
app.use("/api/arco", arcoRoutes);

// Global Error Handler (must be registered last)
app.use(errorHandler);

export default app;