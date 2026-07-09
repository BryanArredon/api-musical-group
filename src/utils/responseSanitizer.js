/**
 * Response Sanitizer Utility
 *
 * Prevents Excessive Data Exposure (OWASP API3:2023 / Mass Assignment).
 * Each function defines an explicit allowlist of fields to return.
 * Any extra fields added to the DB entity will NOT leak to the API consumer.
 */

/**
 * Sanitizes an asset object to expose only public-safe fields.
 * @param {object} asset - Raw asset row from database
 * @returns {object} Sanitized asset
 */
export function sanitizeAsset(asset) {
    if (!asset) return null;
    return {
        id:         asset.id,
        nombre:     asset.nombre,           // Already decrypted by service
        categoria:  asset.categoria,
        estado:     asset.estado,
        created_at: asset.created_at,
        updated_at: asset.updated_at
    };
}

/**
 * Sanitizes a solicitud object to expose only public-safe fields.
 * Strips internal processing metadata from non-admin responses.
 * @param {object} solicitud - Raw solicitud row from database
 * @param {boolean} isAdmin  - Whether the requester is an admin
 * @returns {object} Sanitized solicitud
 */
export function sanitizeSolicitud(solicitud, isAdmin = false) {
    if (!solicitud) return null;

    const base = {
        id:                 solicitud.id,
        activo_id:          solicitud.activo_id,
        estado:             solicitud.estado,
        comentarios:        solicitud.comentarios,
        categoria:          solicitud.categoria,
        activo_estado:      solicitud.activo_estado,
        created_at:         solicitud.created_at,
    };

    if (isAdmin) {
        // Admins additionally see who submitted and who processed
        return {
            ...base,
            colaborador_email:    solicitud.colaborador_email,
            procesado_por:        solicitud.procesado_por,
            fecha_procesamiento:  solicitud.fecha_procesamiento,
            updated_at:           solicitud.updated_at
        };
    }

    // Collaborators only see their own request, not the processor info
    return base;
}

/**
 * Applies a sanitizer to an array of items.
 * @param {Array} items
 * @param {Function} sanitizerFn
 * @param  {...any} args - Extra arguments passed to sanitizerFn
 * @returns {Array}
 */
export function sanitizeList(items, sanitizerFn, ...args) {
    if (!Array.isArray(items)) return [];
    return items.map(item => sanitizerFn(item, ...args));
}
