import * as arcoService from "../services/arcoService.js";
import { auditLog } from "../utils/logger.js";

export async function getDerechoAcceso(req, res, next) {
    const email = req.user?.sub || req.user?.correo;

    if (!email) {
        return res.status(401).json({
            success: false,
            error: "Unauthorized",
            message: "No se pudo identificar al usuario."
        });
    }

    try {
        const datos = await arcoService.obtenerMisDatos(email);
        auditLog(email, "ARCO_ACCESO", { info: "Descarga de datos personales solicitada." });
        
        return res.status(200).json({
            success: true,
            message: "Derecho de Acceso ejercido correctamente. Sus datos personales han sido recopilados.",
            data: datos
        });
    } catch (error) {
        next(error);
    }
}

export async function solicitarCancelacion(req, res, next) {
    const email = req.user?.sub || req.user?.correo;

    if (!email) {
        return res.status(401).json({
            success: false,
            error: "Unauthorized",
            message: "No se pudo identificar al usuario."
        });
    }

    try {
        const result = await arcoService.anonimizarMisDatos(email);
        auditLog(email, "ARCO_CANCELACION", { 
            info: "Anonimización de datos solicitada.",
            registrosAfectados: result.registrosAnonimizados 
        });
        
        return res.status(200).json({
            success: true,
            message: "Derecho de Cancelación ejercido correctamente. Sus datos han sido anonimizados de nuestros registros históricos.",
            certificado: {
                identificadorAsignado: result.identificadorAnonimo,
                registrosAnonimizados: result.registrosAnonimizados,
                fecha: new Date().toISOString()
            }
        });
    } catch (error) {
        next(error);
    }
}
