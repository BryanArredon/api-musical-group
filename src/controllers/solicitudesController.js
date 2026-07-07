import * as solicitudesService from "../services/solicitudesService.js";
import { auditLog } from "../utils/logger.js";
import { validateTextField } from "../utils/securityValidation.js";

export async function createSolicitud(req, res, next) {
    const { activoId, comentarios } = req.body;
    const email = req.user?.sub || req.user?.correo || "UNKNOWN_USER";

    if (!activoId) {
        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: "El campo activoId es obligatorio."
        });
    }

    let safeComentarios = comentarios;
    if (comentarios !== undefined && comentarios !== null && comentarios !== "") {
        const validatedComentarios = validateTextField(comentarios, "comentarios", 500);
        if (!validatedComentarios.isValid) {
            return res.status(400).json({
                success: false,
                error: "Bad Request",
                message: validatedComentarios.message
            });
        }
        safeComentarios = validatedComentarios.value;
    }

    try {
        const solicitud = await solicitudesService.createSolicitud(email, activoId, safeComentarios);
        auditLog(email, "CREATE_SOLICITUD", { solicitudId: solicitud.id, activoId });
        return res.status(201).json({
            success: true,
            message: "Solicitud de activo generada exitosamente.",
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
            data: solicitudes
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
            data: solicitudes
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
            data: solicitudes
        });
    } catch (error) {
        next(error);
    }
}

export async function aprobarSolicitud(req, res, next) {
    const { id } = req.params;
    const adminEmail = req.user?.sub || req.user?.correo || "UNKNOWN_USER";

    try {
        await solicitudesService.procesarSolicitud(id, adminEmail, "Aprobada");
        auditLog(adminEmail, "APPROVE_SOLICITUD", { solicitudId: id });
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

    try {
        await solicitudesService.procesarSolicitud(id, adminEmail, "Rechazada");
        auditLog(adminEmail, "REJECT_SOLICITUD", { solicitudId: id });
        return res.status(200).json({
            success: true,
            message: "Solicitud rechazada con éxito. El activo permanece sin cambios."
        });
    } catch (error) {
        next(error);
    }
}
