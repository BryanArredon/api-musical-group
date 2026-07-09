import app from "./app.js";
import { pool } from "./config/database.js";
import https from "https";
import fs from "fs";
import path from "path";

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await pool.query("SELECT NOW()");
        console.log("✓ Conexión a Base de datos exitosa");
    } catch (error) {
        console.warn("⚠ Advertencia: Error conexión a base de datos");
        console.warn("Detalle del error:", error.message);
        console.warn("La API iniciará pero algunas operaciones no estarán disponibles");
    }

    // Rutas a los certificados (ajustadas al directorio raíz del proyecto)
    const certPath = path.resolve(process.cwd(), "certs", "server.crt");
    const keyPath = path.resolve(process.cwd(), "certs", "server.key");

    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        // Configuración de opciones SSL/TLS
        const options = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
            // Uso estricto de versiones seguras, forzando TLS 1.3 como se recomendó.
            // (Si falla la compatibilidad del navegador, puedes cambiar a 'TLSv1.2')
            minVersion: 'TLSv1.3'
        };

        https.createServer(options, app).listen(PORT, () => {
            console.log(`✓ Servidor HTTPS seguro corriendo en puerto ${PORT} (TLS 1.3)`);
            console.log(`✓ Documentación Swagger disponible en https://localhost:${PORT}/api-docs`);
        });
    } else {
        console.error("❌ ERROR: No se encontraron los certificados SSL en la carpeta 'certs'.");
        console.warn("⚠️ Iniciando de manera insegura por HTTP (Solo para desarrollo).");
        app.listen(PORT, () => {
            console.log(`✓ Servidor HTTP corriendo en puerto ${PORT}`);
            console.log(`✓ Documentación Swagger disponible en http://localhost:${PORT}/api-docs`);
        });
    }
}

startServer();