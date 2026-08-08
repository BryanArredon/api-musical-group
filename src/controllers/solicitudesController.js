import * as solicitudesService from "../services/solicitudesService.js";
import { auditLog } from "../utils/logger.js";
import { validateTextField, validateId } from "../utils/securityValidation.js";
import { sanitizeSolicitud, sanitizeList } from "../utils/responseSanitizer.js";

export async function createSolicitud(req, res, next) {
    const { activosIds, comentarios, fechaInicio, fechaFin, nombreEvento, ubicacion } = req.body;
    const email = req.user?.sub || req.user?.correo || "UNKNOWN_USER";

    if (!activosIds || !Array.isArray(activosIds) || activosIds.length === 0) {
        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: "El campo activosIds es obligatorio y debe ser un arreglo."
        });
    }

    if (!fechaInicio || !fechaFin || !nombreEvento) {
        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: "Los campos fechaInicio, fechaFin y nombreEvento son obligatorios en la V2."
        });
    }

    let safeComentarios = comentarios;
    if (comentarios !== undefined && comentarios !== null && comentarios !== "") {
        const validatedComentarios = validateTextField(comentarios, "comentarios", 500);
        if (!validatedComentarios.isValid) {
            return res.status(400).json({ success: false, error: "Bad Request", message: validatedComentarios.message });
        }
        safeComentarios = validatedComentarios.value;
    }

    try {
        const solicitud = await solicitudesService.createSolicitud(email, activosIds, safeComentarios, fechaInicio, fechaFin, nombreEvento, ubicacion);
        auditLog(email, "CREATE_SOLICITUD_V2", { solicitudId: solicitud.id, activosCount: activosIds.length });
        return res.status(201).json({
            success: true,
            message: "Solicitud de activos generada exitosamente en V2.",
            data: solicitud
        });
    } catch (error) {
        next(error);
    }
}

export async function getPendingSolicitudes(req, res, next) {
    const email = req.user?.sub || req.user?.correo || "UNKNOWN_USER";
    try {
        const solicitudes = await solicitudesService.getPendingSolicitudes();
        auditLog(email, "GET_PENDING_SOLICITUDES", { count: solicitudes.length });
        return res.status(200).json({
            success: true,
            data: sanitizeList(solicitudes, sanitizeSolicitud, true) // [Mass Exposure] Admin view
        });
    } catch (error) {
        next(error);
    }
}

export async function getAllSolicitudes(req, res, next) {
    const email = req.user?.sub || req.user?.correo || "UNKNOWN_USER";
    try {
        const solicitudes = await solicitudesService.getAllSolicitudes();
        auditLog(email, "GET_ALL_SOLICITUDES", { count: solicitudes.length });
        return res.status(200).json({
            success: true,
            data: sanitizeList(solicitudes, sanitizeSolicitud, true) // [Mass Exposure] Admin view
        });
    } catch (error) {
        next(error);
    }
}

export async function getUserSolicitudes(req, res, next) {
    const email = req.user?.sub || req.user?.correo || "UNKNOWN_USER";
    try {
        const solicitudes = await solicitudesService.getUserSolicitudes(email);
        auditLog(email, "GET_USER_SOLICITUDES", { count: solicitudes.length });
        return res.status(200).json({
            success: true,
            data: sanitizeList(solicitudes, sanitizeSolicitud, false) // [Mass Exposure] Collaborator view
        });
    } catch (error) {
        next(error);
    }
}

export async function aprobarSolicitud(req, res, next) {
    const { id } = req.params;
    const adminEmail = req.user?.sub || req.user?.correo || "UNKNOWN_USER";

    // [BOLA] Validate ID is a positive integer
    const validId = validateId(id);
    if (!validId.isValid) {
        return res.status(400).json({ success: false, error: "Bad Request", message: validId.message });
    }

    try {
        await solicitudesService.procesarSolicitud(validId.value, adminEmail, "Aprobada");
        auditLog(adminEmail, "APPROVE_SOLICITUD", { solicitudId: validId.value });
        return res.status(200).json({
            success: true,
            message: "Solicitud aprobada con éxito. El estado del activo ha cambiado automáticamente."
        });
    } catch (error) {
        next(error);
    }
}

export async function rejectSolicitud(req, res, next) {
    const { id } = req.params;
    const adminEmail = req.user?.sub || req.user?.correo || "UNKNOWN_USER";

    // [BOLA] Validate ID is a positive integer
    const validId = validateId(id);
    if (!validId.isValid) {
        return res.status(400).json({ success: false, error: "Bad Request", message: validId.message });
    }

    try {
        await solicitudesService.procesarSolicitud(validId.value, adminEmail, "Rechazada");
        auditLog(adminEmail, "REJECT_SOLICITUD", { solicitudId: validId.value });
        return res.status(200).json({
            success: true,
            message: "Solicitud rechazada con éxito. El activo permanece sin cambios."
        });
    } catch (error) {
        next(error);
    }
}

export async function devolverActivo(req, res, next) {
    const { id } = req.params;
    const { estadoFisico, urlsFotos, detallesDano } = req.body;
    const adminEmail = req.user?.sub || req.user?.correo || "UNKNOWN_USER";

    // [BOLA] Validate ID is UUID
    const validId = validateId(id);
    if (!validId.isValid) {
        return res.status(400).json({ success: false, error: "Bad Request", message: validId.message });
    }

    if (!estadoFisico) {
        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: "El campo estadoFisico es obligatorio (bueno, regular, malo, danado)."
        });
    }

    try {
        const result = await solicitudesService.registrarDevolucion(validId.value, adminEmail, estadoFisico, urlsFotos, detallesDano);
        auditLog(adminEmail, "RETURN_ACTIVOS_V2", { solicitudId: validId.value });
        return res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (error) {
        next(error);
    }
}

export async function obtenerHistorialDevoluciones(req, res, next) {
    const adminEmail = req.user?.sub || req.user?.correo || "UNKNOWN_USER";
    try {
        const historial = await solicitudesService.getHistorialDevoluciones();
        auditLog(adminEmail, "GET_HISTORIAL_DEVOLUCIONES", { count: historial.length });
        return res.status(200).json({
            success: true,
            data: historial
        });
    } catch (error) {
        next(error);
    }
}
