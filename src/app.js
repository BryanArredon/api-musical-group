import express from "express";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import activosRoutes from "./routes/activosRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import solicitudesRoutes from "./routes/solicitudesRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { specs } from "./config/swagger.js";

const app = express();
app.enable("trust proxy");

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Cookie parser para leer las cookies HttpOnly enviadas por el navegador
app.use(cookieParser());

// Security headers and CORS middleware (LGPDPPSO & OWASP standards)
// NOTA: Access-Control-Allow-Origin ya NO puede ser '*' cuando se usan cookies
// (credentials). Debe especificarse el origen exacto del FrontEnd.
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://localhost:5173";
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none';");

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

// Main routes for API
app.use("/api/auth", authRoutes);
app.use("/api/activos", activosRoutes);
app.use("/api/solicitudes", solicitudesRoutes);

// Global Error Handler (must be registered last)
app.use(errorHandler);

export default app;