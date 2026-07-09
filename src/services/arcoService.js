import { pool } from "../config/database.js";
import crypto from "crypto";

/**
 * Obtiene todos los datos personales y registros asociados a un usuario por su correo.
 * Cumple con el derecho de Acceso (LGPDPPSO).
 */
export async function obtenerMisDatos(email) {
    const data = {
        email: email,
        solicitudes: [],
        devoluciones: []
    };

    // 1. Obtener todas las solicitudes del usuario
    const resSolicitudes = await pool.query(
        `SELECT id, activo_id, estado, comentarios, fecha_procesamiento, created_at 
         FROM solicitudes 
         WHERE colaborador_email = $1
         ORDER BY created_at DESC`,
        [email]
    );
    data.solicitudes = resSolicitudes.rows;

    // 2. Obtener todas las devoluciones realizadas por el usuario
    const resDevoluciones = await pool.query(
        `SELECT h.id, h.solicitud_id, h.activo_id, h.condiciones_fisicas, h.fecha_devolucion 
         FROM historial_devoluciones h
         WHERE h.devuelto_por = $1
         ORDER BY h.fecha_devolucion DESC`,
        [email]
    );
    data.devoluciones = resDevoluciones.rows;

    return data;
}

/**
 * Anonimiza los datos personales del usuario en todas las tablas históricas.
 * Cumple con el derecho de Cancelación sin romper la integridad del inventario.
 */
export async function anonimizarMisDatos(email) {
    const client = await pool.connect();
    
    // Crear un hash irreversible único para este usuario, 
    // de modo que se sepa que fue la misma persona pero sin revelar quién.
    const hashUnico = crypto.createHash("sha256").update(email + Date.now().toString()).digest("hex").substring(0, 15);
    const identificadorAnonimo = `anonimo_${hashUnico}`;

    try {
        await client.query("BEGIN");

        // 1. Anonimizar en solicitudes
        const resSolicitudes = await client.query(
            "UPDATE solicitudes SET colaborador_email = $1 WHERE colaborador_email = $2",
            [identificadorAnonimo, email]
        );

        // 2. Anonimizar en historial_devoluciones (como devuelto_por)
        const resDevoluciones = await client.query(
            "UPDATE historial_devoluciones SET devuelto_por = $1 WHERE devuelto_por = $2",
            [identificadorAnonimo, email]
        );

        // 3. Anonimizar en historial_devoluciones (como recibido_por - si fuera admin)
        const resRecibidos = await client.query(
            "UPDATE historial_devoluciones SET recibido_por = $1 WHERE recibido_por = $2",
            [identificadorAnonimo, email]
        );

        // 4. Anonimizar como procesado_por en solicitudes (si fuera admin)
        const resProcesados = await client.query(
            "UPDATE solicitudes SET procesado_por = $1 WHERE procesado_por = $2",
            [identificadorAnonimo, email]
        );

        await client.query("COMMIT");

        const registrosAfectados = resSolicitudes.rowCount + resDevoluciones.rowCount + resRecibidos.rowCount + resProcesados.rowCount;

        return { 
            success: true, 
            identificadorAnonimo,
            registrosAnonimizados: registrosAfectados
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}
