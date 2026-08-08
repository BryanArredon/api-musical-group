import { pool } from "../config/database.js";

// Encryption key for pgcrypto (derived from JWT secret or system policy)
const ENCRYPTION_KEY = process.env.JWT_SECRET || "8a9b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b";

async function getOrCreateCategoria(client, nombre) {
    const res = await client.query("SELECT id FROM categorias WHERE nombre = $1", [nombre]);
    if (res.rows.length > 0) return res.rows[0].id;
    const insertRes = await client.query("INSERT INTO categorias (nombre) VALUES ($1) RETURNING id", [nombre]);
    return insertRes.rows[0].id;
}

/**
 * Creates a new asset inside a secure SQL transaction.
 * Automatically performs a ROLLBACK if any operation fails.
 */
export async function createAsset(nombre, categoria, estado) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        const categoriaId = await getOrCreateCategoria(client, categoria);
        
        const queryText = `
            INSERT INTO activos_v2 (nombre_cifrado, categoria_id, estado)
            VALUES (pgp_sym_encrypt($1::text, $2::text), $3, $4)
            RETURNING id, estado, created_at, updated_at
        `;
        const res = await client.query(queryText, [nombre, ENCRYPTION_KEY, categoriaId, estado]);
        
        await client.query("COMMIT");
        
        return {
            id: res.rows[0].id,
            nombre,
            categoria: categoria,
            estado: res.rows[0].estado,
            created_at: res.rows[0].created_at,
            updated_at: res.rows[0].updated_at
        };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Retrieves all assets and decrypts their names on-the-fly.
 */
export async function getAllAssets() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        const queryText = `
            SELECT a.id, pgp_sym_decrypt(a.nombre_cifrado, $1::text) as nombre, c.nombre as categoria, a.estado, a.created_at, a.updated_at
            FROM activos_v2 a
            JOIN categorias c ON a.categoria_id = c.id
        `;
        const res = await client.query(queryText, [ENCRYPTION_KEY]);
        
        await client.query("COMMIT");
        return res.rows;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Retrieves a single asset by ID decrypting its name.
 */
export async function getAssetById(id) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        const queryText = `
            SELECT a.id, pgp_sym_decrypt(a.nombre_cifrado, $1::text) as nombre, c.nombre as categoria, a.estado, a.created_at, a.updated_at
            FROM activos_v2 a
            JOIN categorias c ON a.categoria_id = c.id
            WHERE a.id = $2
        `;
        const res = await client.query(queryText, [ENCRYPTION_KEY, id]);
        
        await client.query("COMMIT");
        return res.rows[0] || null;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Updates an asset inside a transaction with automatic rollback.
 */
export async function updateAsset(id, nombre, categoria, estado) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        // Verify existence
        const checkRes = await client.query("SELECT id FROM activos_v2 WHERE id = $1", [id]);
        if (checkRes.rows.length === 0) {
            await client.query("COMMIT");
            return null;
        }

        const categoriaId = await getOrCreateCategoria(client, categoria);

        const queryText = `
            UPDATE activos_v2
            SET nombre_cifrado = pgp_sym_encrypt($1::text, $2::text), categoria_id = $3, estado = $4, updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING id, estado, created_at, updated_at
        `;
        const res = await client.query(queryText, [nombre, ENCRYPTION_KEY, categoriaId, estado, id]);
        
        await client.query("COMMIT");
        return {
            id: res.rows[0].id,
            nombre,
            categoria: categoria,
            estado: res.rows[0].estado,
            created_at: res.rows[0].created_at,
            updated_at: res.rows[0].updated_at
        };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Deletes an asset inside an atomic transaction.
 */
export async function deleteAsset(id) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        const checkRes = await client.query("SELECT id FROM activos_v2 WHERE id = $1", [id]);
        if (checkRes.rows.length === 0) {
            await client.query("COMMIT");
            return false;
        }

        await client.query("DELETE FROM activos_v2 WHERE id = $1", [id]);
        await client.query("COMMIT");
        return true;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}
