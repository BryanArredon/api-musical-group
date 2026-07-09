import { pool } from "../config/database.js";

/**
 * Creates a new request for an asset in state 'Pendiente'.
 */
export async function createSolicitud(colaboradorEmail, activoId, comentarios) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Verify if active asset exists
        const assetRes = await client.query("SELECT id, estado FROM activos WHERE id = $1", [activoId]);
        if (assetRes.rows.length === 0) {
            throw new Error("El activo solicitado no existe.");
        }

        const queryText = `
            INSERT INTO solicitudes (colaborador_email, activo_id, comentarios, estado)
            VALUES ($1, $2, $3, 'Pendiente')
            RETURNING id, colaborador_email, activo_id, estado, comentarios, created_at, updated_at
        `;
        const res = await client.query(queryText, [colaboradorEmail, activoId, comentarios]);

        await client.query("COMMIT");
        return res.rows[0];
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Returns all requests with 'Pendiente' status.
 */
export async function getPendingSolicitudes() {
    const queryText = `
        SELECT s.id, s.colaborador_email, s.activo_id, s.estado, s.comentarios, s.created_at,
               a.categoria, a.estado as activo_estado
        FROM solicitudes s
        JOIN activos a ON s.activo_id = a.id
        WHERE s.estado = 'Pendiente'
        ORDER BY s.created_at ASC
    `;
    const res = await pool.query(queryText);
    return res.rows;
}

/**
 * Returns all requests.
 */
export async function getAllSolicitudes() {
    const queryText = `
        SELECT s.id, s.colaborador_email, s.activo_id, s.estado, s.comentarios, s.created_at,
               a.categoria, a.estado as activo_estado
        FROM solicitudes s
        JOIN activos a ON s.activo_id = a.id
        ORDER BY s.created_at DESC
    `;
    const res = await pool.query(queryText);
    return res.rows;
}

/**
 * Returns all requests for a specific user.
 */
export async function getUserSolicitudes(email) {
    const queryText = `
        SELECT s.id, s.colaborador_email, s.activo_id, s.estado, s.comentarios, s.created_at,
               a.categoria, a.estado as activo_estado
        FROM solicitudes s
        JOIN activos a ON s.activo_id = a.id
        WHERE s.colaborador_email = $1
        ORDER BY s.created_at DESC
    `;
    const res = await pool.query(queryText, [email]);
    return res.rows;
}

/**
 * Atomically approves or rejects a request.
 * Automatically handles transaction rollback in case of validation or database failure.
 */
export async function procesarSolicitud(solicitudId, adminEmail, nuevoEstado) {
    if (!["Aprobada", "Rechazada"].includes(nuevoEstado)) {
        throw new Error("Estado de procesamiento inválido. Debe ser 'Aprobada' o 'Rechazada'.");
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Check if the request exists and get details
        const solRes = await client.query(
            "SELECT id, estado, activo_id FROM solicitudes WHERE id = $1 FOR UPDATE",
            [solicitudId]
        );
        if (solRes.rows.length === 0) {
            const error = new Error("La solicitud no existe.");
            error.status = 404;
            throw error;
        }

        const solicitud = solRes.rows[0];

        // 2. Verify if the request was already processed
        if (solicitud.estado !== "Pendiente") {
            const error = new Error("Esta solicitud ya ha sido procesada previamente.");
            error.status = 400;
            throw error;
        }

        const activoId = solicitud.activo_id;

        if (nuevoEstado === "Aprobada") {
            // 3. Verify asset availability
            const assetRes = await client.query(
                "SELECT id, estado FROM activos WHERE id = $1 FOR UPDATE",
                [activoId]
            );
            if (assetRes.rows.length === 0) {
                const error = new Error("El activo asociado a la solicitud ya no existe.");
                error.status = 404;
                throw error;
            }

            const activo = assetRes.rows[0];
            if (activo.estado === "Asignado") {
                const error = new Error("El activo solicitado ya se encuentra asignado a otra solicitud aprobada.");
                error.status = 400;
                throw error;
            }

            // 4. Update request status to 'Aprobada'
            await client.query(
                `UPDATE solicitudes 
                 SET estado = 'Aprobada', procesado_por = $1, fecha_procesamiento = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [adminEmail, solicitudId]
            );

            // 5. Update asset status to 'Asignado'
            await client.query(
                "UPDATE activos SET estado = 'Asignado', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                [activoId]
            );

        } else if (nuevoEstado === "Rechazada") {
            // 4. Update request status to 'Rechazada' (Asset status remains unchanged)
            await client.query(
                `UPDATE solicitudes 
                 SET estado = 'Rechazada', procesado_por = $1, fecha_procesamiento = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [adminEmail, solicitudId]
            );
        }

        await client.query("COMMIT");
        return { success: true, estadoFinal: nuevoEstado };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Registra la devolución de un activo de forma atómica.
 */
export async function registrarDevolucion(solicitudId, adminEmail, condicionesFisicas) {
    if (!condicionesFisicas || condicionesFisicas.trim() === "") {
        throw new Error("Debe proporcionar las condiciones físicas en las que se devuelve el activo.");
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Obtener la solicitud
        const solRes = await client.query(
            "SELECT id, estado, activo_id, colaborador_email FROM solicitudes WHERE id = $1 FOR UPDATE",
            [solicitudId]
        );
        if (solRes.rows.length === 0) {
            const error = new Error("La solicitud no existe.");
            error.status = 404;
            throw error;
        }

        const solicitud = solRes.rows[0];

        // 2. Verificar que la solicitud esté 'Aprobada'
        if (solicitud.estado !== "Aprobada") {
            const error = new Error(`Solo se pueden devolver activos de solicitudes aprobadas. Estado actual: ${solicitud.estado}`);
            error.status = 400;
            throw error;
        }

        // 3. Actualizar la solicitud a 'Devuelta'
        await client.query(
            "UPDATE solicitudes SET estado = 'Devuelta', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [solicitudId]
        );

        // 4. Registrar en el historial de devoluciones
        await client.query(
            `INSERT INTO historial_devoluciones (solicitud_id, activo_id, devuelto_por, recibido_por, condiciones_fisicas)
             VALUES ($1, $2, $3, $4, $5)`,
            [solicitudId, solicitud.activo_id, solicitud.colaborador_email, adminEmail, condicionesFisicas]
        );

        // 5. Liberar el activo (volver a 'Disponible')
        await client.query(
            "UPDATE activos SET estado = 'Disponible', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [solicitud.activo_id]
        );

        await client.query("COMMIT");
        return { success: true, message: "Devolución registrada exitosamente." };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Retorna el historial completo de devoluciones.
 */
export async function getHistorialDevoluciones() {
    const queryText = `
        SELECT h.id, h.solicitud_id, h.activo_id, h.devuelto_por, h.recibido_por, h.condiciones_fisicas, h.fecha_devolucion,
               a.nombre as activo_nombre, a.categoria
        FROM historial_devoluciones h
        JOIN activos a ON h.activo_id = a.id
        ORDER BY h.fecha_devolucion DESC
    `;
    const res = await pool.query(queryText);
    return res.rows;
}
