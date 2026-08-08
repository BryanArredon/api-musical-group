import fs from "fs";
import path from "path";
import { pool } from "../config/database.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//
async function runMigration() {
    console.log("Iniciando migración de base de datos a Supabase...");
    const v2Path = path.join(__dirname, "v2_schema.sql");
    const v2Content = fs.readFileSync(v2Path, "utf8");

    const client = await pool.connect();
    try {
        console.log("Conectado a la base de datos Supabase exitosamente.");
        
        console.log("Eliminando tablas obsoletas (V1)...");
        await client.query(`
            DROP TABLE IF EXISTS historial_devoluciones CASCADE;
            DROP TABLE IF EXISTS solicitudes CASCADE;
            DROP TABLE IF EXISTS activos CASCADE;
            DROP TABLE IF EXISTS usuarios CASCADE;
        `);

        console.log("Ejecutando script de migración para esquema V2 Empresarial...");
        await client.query(v2Content);
        
        console.log("¡Migración V2 completada exitosamente! Tablas y extensiones creadas.");
    } catch (error) {
        console.error("Error durante la migración de la base de datos:");
        console.error(error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
