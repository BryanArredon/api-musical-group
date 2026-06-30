import fs from "fs";
import path from "path";
import { pool } from "../config/database.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//
async function runMigration() {
    console.log("Iniciando migración de base de datos a Supabase...");
    const sqlPath = path.join(__dirname, "activos.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf8");

    const client = await pool.connect();
    try {
        console.log("Conectado a la base de datos Supabase exitosamente.");
        console.log("Ejecutando script de migración...");
        
        await client.query(sqlContent);
        
        console.log("¡Migración completada exitosamente! Tabla 'activos' y extensión 'pgcrypto' creadas/verificadas.");
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
