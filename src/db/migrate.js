import fs from "fs";
import path from "path";
import { pool } from "../config/database.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//
async function runMigration() {
    console.log("Iniciando migración de base de datos a Supabase...");
    const activosPath = path.join(__dirname, "activos.sql");
    const activosContent = fs.readFileSync(activosPath, "utf8");

    const solicitudesPath = path.join(__dirname, "solicitudes.sql");
    const solicitudesContent = fs.readFileSync(solicitudesPath, "utf8");

    const client = await pool.connect();
    try {
        console.log("Conectado a la base de datos Supabase exitosamente.");
        console.log("Ejecutando script de migración para activos...");
        await client.query(activosContent);
        
        console.log("Ejecutando script de migración para solicitudes...");
        await client.query(solicitudesContent);
        
        console.log("¡Migración completada exitosamente! Tablas y extensiones creadas/verificadas.");
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
