import { pool } from "../config/database.js";

const ENCRYPTION_KEY = process.env.JWT_SECRET || "8a9b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b";

async function testInsert() {
    console.log("Iniciando prueba de inserción directa en Supabase...");
    const client = await pool.connect();
    
    try {
        await client.query("BEGIN");
        
        // 1. Insert a test asset encrypting its name
        console.log("Insertando activo de prueba (con cifrado pgcrypto)...");
        const assetRes = await client.query(`
            INSERT INTO activos (nombre_cifrado, categoria, estado)
            VALUES (pgp_sym_encrypt('Guitarra Fender Stratocaster'::text, $1::text), 'Instrumentos', 'Disponible')
            RETURNING id, categoria, estado, created_at
        `, [ENCRYPTION_KEY]);
        
        const assetId = assetRes.rows[0].id;
        console.log(`¡Activo insertado! ID: ${assetId}, Categoría: ${assetRes.rows[0].categoria}, Estado: ${assetRes.rows[0].estado}`);

        // 2. Insert a request for this asset
        console.log("Insertando solicitud de prueba asociada...");
        const requestRes = await client.query(`
            INSERT INTO solicitudes (colaborador_email, activo_id, comentarios, estado)
            VALUES ('colaborador.prueba@musical.com', $1, 'Necesito este instrumento para las prácticas semanales', 'Pendiente')
            RETURNING id, colaborador_email, estado, comentarios, created_at
        `, [assetId]);

        const requestId = requestRes.rows[0].id;
        console.log(`¡Solicitud insertada! ID: ${requestId}, Colaborador: ${requestRes.rows[0].colaborador_email}, Estado: ${requestRes.rows[0].estado}`);
        
        await client.query("COMMIT");
        console.log("\nTransacción confirmada en Supabase.");

        // 3. Select back to verify and decrypt
        console.log("\nVerificando los datos guardados en la BD:");
        const verifyAsset = await client.query(`
            SELECT id, pgp_sym_decrypt(nombre_cifrado, $1::text) as nombre, categoria, estado 
            FROM activos WHERE id = $2
        `, [ENCRYPTION_KEY, assetId]);
        
        console.log("Datos del activo desencriptados desde Supabase:", verifyAsset.rows[0]);

        const verifyRequest = await client.query(`
            SELECT * FROM solicitudes WHERE id = $1
        `, [requestId]);
        
        console.log("Datos de la solicitud guardada en Supabase:", verifyRequest.rows[0]);

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error durante la prueba de inserción:", error);
    } finally {
        client.release();
        await pool.end();
        console.log("\nConexión cerrada.");
    }
}

testInsert();
