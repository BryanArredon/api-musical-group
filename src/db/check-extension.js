import { pool } from "../config/database.js";

async function checkExtension() {
    const client = await pool.connect();
    try {
        console.log("Comprobando extensiones y funciones...");
        
        // 1. List extensions
        const extRes = await client.query(`
            SELECT extname, extnamespace::regnamespace as schema 
            FROM pg_extension
        `);
        console.log("Extensiones instaladas:", extRes.rows);

        // 2. Find pgp_sym_encrypt function schema
        const funcRes = await client.query(`
            SELECT nspname as schema, proname
            FROM pg_proc 
            JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
            WHERE proname = 'pgp_sym_encrypt'
        `);
        console.log("Función pgp_sym_encrypt encontrada en:", funcRes.rows);

    } catch (error) {
        console.error("Error al comprobar:", error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkExtension();
