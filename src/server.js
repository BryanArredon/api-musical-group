import app from "./app.js";
import { pool } from "./config/database.js";

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await pool.query("SELECT NOW()");

        console.log("Conexion a Base de datos exitosa");

        app.listen(PORT, () => {
            console.log(`Servidor corriendo en puerto ${PORT}`);
        });
    } catch (error) {
        console.error("Error conexion a base de datos");
        console.error(error);
    }
}

startServer();