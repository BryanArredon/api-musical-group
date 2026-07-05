import express from "express";
import activosRoutes from "./routes/activosRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import solicitudesRoutes from "./routes/solicitudesRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Security headers and CORS middleware (LGPDPPSO & OWASP standards)
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none';");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

// Main routes for API
app.use("/api/auth", authRoutes);
app.use("/api/activos", activosRoutes);
app.use("/api/solicitudes", solicitudesRoutes);

// Global Error Handler (must be registered last)
app.use(errorHandler);

export default app;