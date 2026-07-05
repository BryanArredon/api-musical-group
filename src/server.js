import app from "./app.js";
import { pool } from "./config/database.js";

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await pool.query("SELECT NOW()");
        console.log("✓ Conexión a Base de datos exitosa");
    } catch (error) {
        console.warn("⚠ Advertencia: Error conexión a base de datos");
        console.warn("La API iniciará pero algunas operaciones no estarán disponibles");
    }

    app.listen(PORT, () => {
        console.log(`✓ Servidor corriendo en puerto ${PORT}`);
        console.log(`✓ Documentación Swagger disponible en http://localhost:${PORT}/api-docs`);
        console.log(`✓ Especificación OpenAPI en http://localhost:${PORT}/api-docs.json`);
    });
}

startServer();