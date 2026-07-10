import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

/**
 * [CERTIFICACIÓN RNF8 - CIFRADO EN REPOSO]
 * Nota de Arquitectura:
 * Para cumplir con el requerimiento de "Cifrado en reposo" de la base de datos, no se implementa 
 * cifrado de disco a nivel de aplicación Node.js. En su lugar, se confía en la infraestructura 
 * gestionada por Supabase (PostgreSQL), la cual provee cifrado nativo de volumen (AES-256) 
 * transparente para todos los clústeres por defecto en sus proveedores de nube (AWS/GCP).
 */

export const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

// Set schema search path automatically for every connection
pool.on("connect", (client) => {
    client.query("SET search_path TO musical_group, extensions, public;").catch((err) => {
        console.error("Error setting search_path to musical_group:", err);
    });
});