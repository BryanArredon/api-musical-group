import { pool } from "../config/database.js";

/**
 * Registra una nueva solicitud de préstamo V2.
 * Soporta múltiples activos y control de fechas/eventos.
 */
export async function createSolicitud(email, activosIds, comentarios, fechaInicio, fechaFin, nombreEvento, ubicacion) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Obtener el UUID del usuario a partir de su correo
        const userRes = await client.query("SELECT id FROM perfiles WHERE email = $1", [email]);
        if (userRes.rows.length === 0) {
            throw new Error("Usuario no encontrado.");
        }
        const usuarioId = userRes.rows[0].id;

        // 2. Verificar que TODOS los activos existen y están disponibles
        for (const activoId of activosIds) {
            const assetRes = await client.query("SELECT id, estado FROM activos_v2 WHERE id = $1 FOR UPDATE", [activoId]);
            if (assetRes.rows.length === 0) {
                throw new Error(`El activo solicitado (${activoId}) no existe.`);
            }
            if (assetRes.rows[0].estado !== 'disponible' && assetRes.rows[0].estado !== 'Disponible') {
                throw new Error(`El activo (${activoId}) no está disponible actualmente.`);
            }
        }

        // 3. Crear la Solicitud
        const queryText = `
            INSERT INTO solicitudes_v2 (usuario_id, fecha_inicio, fecha_fin, nombre_evento, ubicacion, comentarios, estado)
            VALUES ($1, $2, $3, $4, $5, $6, 'pendiente')
            RETURNING id, estado, created_at
        `;
        const res = await client.query(queryText, [usuarioId, fechaInicio, fechaFin, nombreEvento, ubicacion, comentarios]);
        const solicitud = res.rows[0];

        // 4. Crear la relación en la tabla pivote y actualizar el estado temporal
        for (const activoId of activosIds) {
            await client.query(
                "INSERT INTO solicitud_activos_v2 (solicitud_id, activo_id) VALUES ($1, $2)",
                [solicitud.id, activoId]
            );
        }

        await client.query("COMMIT");
        return solicitud;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Returns all requests with 'pendiente' status.
 */
export async function getPendingSolicitudes() {
    const queryText = `
        SELECT s.id, p.email as colaborador_email, s.estado, s.comentarios, s.nombre_evento, s.fecha_inicio, s.fecha_fin, s.created_at
        FROM solicitudes_v2 s
        JOIN perfiles p ON s.usuario_id = p.id
        WHERE s.estado = 'pendiente' OR s.estado = 'Pendiente'
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
        SELECT s.id, p.email as colaborador_email, s.estado, s.comentarios, s.nombre_evento, s.fecha_inicio, s.fecha_fin, s.created_at
        FROM solicitudes_v2 s
        JOIN perfiles p ON s.usuario_id = p.id
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
        SELECT s.id, p.email as colaborador_email, s.estado, s.comentarios, s.nombre_evento, s.fecha_inicio, s.fecha_fin, s.created_at
        FROM solicitudes_v2 s
        JOIN perfiles p ON s.usuario_id = p.id
        WHERE p.email = $1
        ORDER BY s.created_at DESC
    `;
    const res = await pool.query(queryText, [email]);
    return res.rows;
}

/**
 * Atomically approves or rejects a request.
 */
export async function procesarSolicitud(solicitudId, adminEmail, nuevoEstado) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const solRes = await client.query(
            "SELECT id, estado FROM solicitudes_v2 WHERE id = $1 FOR UPDATE",
            [solicitudId]
        );
        if (solRes.rows.length === 0) {
            const error = new Error("La solicitud no existe.");
            error.status = 404;
            throw error;
        }

        const solicitud = solRes.rows[0];
        if (solicitud.estado !== "pendiente" && solicitud.estado !== "Pendiente") {
            const error = new Error("Esta solicitud ya ha sido procesada previamente.");
            error.status = 400;
            throw error;
        }

        if (nuevoEstado === "Aprobada" || nuevoEstado === "aprobada") {
            const activosRes = await client.query(
                "SELECT id, estado FROM activos_v2 WHERE id IN (SELECT activo_id FROM solicitud_activos_v2 WHERE solicitud_id = $1)",
                [solicitudId]
            );
            for (const activo of activosRes.rows) {
                if (activo.estado !== "disponible" && activo.estado !== "Disponible") {
                    const error = new Error(`El activo ${activo.id} ya se encuentra asignado a otra persona.`);
                    error.status = 400;
                    throw error;
                }
            }

            // Update request
            await client.query(
                "UPDATE solicitudes_v2 SET estado = 'aprobada', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                [solicitudId]
            );

            // Update all related assets
            await client.query(
                "UPDATE activos_v2 SET estado = 'asignado', updated_at = CURRENT_TIMESTAMP WHERE id IN (SELECT activo_id FROM solicitud_activos_v2 WHERE solicitud_id = $1)",
                [solicitudId]
            );
        } else if (nuevoEstado === "Rechazada" || nuevoEstado === "rechazada") {
            await client.query(
                "UPDATE solicitudes_v2 SET estado = 'rechazada', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                [solicitudId]
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
 * Registra la devolución de los activos asociados a una solicitud en la V2.
 */
export async function registrarDevolucion(solicitudId, adminEmail, estadoFisico, urlsFotos, detallesDano) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const adminRes = await client.query("SELECT id FROM perfiles WHERE email = $1", [adminEmail]);
        const adminId = adminRes.rows.length > 0 ? adminRes.rows[0].id : null;

        const solRes = await client.query(
            "SELECT id, estado FROM solicitudes_v2 WHERE id = $1 FOR UPDATE",
            [solicitudId]
        );
        if (solRes.rows.length === 0) {
            const error = new Error("La solicitud no existe.");
            error.status = 404;
            throw error;
        }

        const solicitud = solRes.rows[0];
        if (solicitud.estado !== "aprobada" && solicitud.estado !== "Aprobada") {
            const error = new Error(`Solo se pueden devolver activos de solicitudes aprobadas. Estado actual: ${solicitud.estado}`);
            error.status = 400;
            throw error;
        }

        await client.query(
            "UPDATE solicitudes_v2 SET estado = 'devuelta', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [solicitudId]
        );

        await client.query(
            "INSERT INTO devoluciones_v2 (solicitud_id, estado_fisico, urls_fotos, detalles_dano, evaluado_por) VALUES ($1, $2::estado_fisico, $3, $4, $5)",
            [solicitudId, estadoFisico, urlsFotos || [], detallesDano, adminId]
        );

        // Liberar todos los activos
        await client.query(
            "UPDATE activos_v2 SET estado = 'disponible', updated_at = CURRENT_TIMESTAMP WHERE id IN (SELECT activo_id FROM solicitud_activos_v2 WHERE solicitud_id = $1)",
            [solicitudId]
        );

        await client.query("COMMIT");
        return { success: true, message: "Devolución registrada exitosamente en V2." };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

export async function getHistorialDevoluciones() {
    const queryText = `
        SELECT d.id, d.solicitud_id, d.estado_fisico, d.detalles_dano, d.created_at, p.email as evaluador
        FROM devoluciones_v2 d
        LEFT JOIN perfiles p ON d.evaluado_por = p.id
        ORDER BY d.created_at DESC
    `;
    const res = await pool.query(queryText);
    return res.rows;
}
