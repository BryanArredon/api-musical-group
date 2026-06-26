import express from "express";
import activosRoutes from "./routes/activosRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Main entry point for assets API
app.use("/api/activos", activosRoutes);

// Global Error Handler (must be registered last)
app.use(errorHandler);

export default app;
