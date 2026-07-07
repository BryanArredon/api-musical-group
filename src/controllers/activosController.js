import * as activosService from "../services/activosService.js";
import { auditLog } from "../utils/logger.js";
import { validateTextField } from "../utils/securityValidation.js";

/**
 * Controller for managing assets
 */

export async function createAsset(req, res, next) {
    const { nombre, categoria, estado } = req.body;
    const userId = req.user?.sub || req.user?.correo || "UNKNOWN_USER";

    if (!nombre || !categoria || !estado) {
        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: "Faltan campos obligatorios: nombre, categoria, estado."
        });
    }

    const validatedNombre = validateTextField(nombre, "nombre", 100);
    if (!validatedNombre.isValid) {
        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: validatedNombre.message
        });
    }

    const validatedCategoria = validateTextField(categoria, "categoria", 50);
    if (!validatedCategoria.isValid) {
        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: validatedCategoria.message
        });
    }

    const validatedEstado = validateTextField(estado, "estado", 20);
    if (!validatedEstado.isValid) {
        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: validatedEstado.message
        });
    }

    try {
        const asset = await activosService.createAsset(validatedNombre.value, validatedCategoria.value, validatedEstado.value);

        // Audit log with anonymization built-in
        auditLog(userId, "CREATE_ASSET", { assetId: asset.id, nombre: validatedNombre.value, categoria: validatedCategoria.value, estado: validatedEstado.value });

        return res.status(201).json({
            success: true,
            message: "Activo registrado y guardado exitosamente de forma consistente.",
            data: asset
        });
    } catch (error) {
        next(error);
    }
}

export async function getAllAssets(req, res, next) {
    const userId = req.user?.sub || req.user?.correo || "UNKNOWN_USER";
    try {
        const assets = await activosService.getAllAssets();
        auditLog(userId, "GET_ALL_ASSETS", { count: assets.length });
        return res.status(200).json({
            success: true,
            data: assets
        });
    } catch (error) {
        next(error);
    }
}

export async function getAssetById(req, res, next) {
    const { id } = req.params;
    const userId = req.user?.sub || req.user?.correo || "UNKNOWN_USER";
    try {
        const asset = await activosService.getAssetById(id);
        if (!asset) {
            return res.status(404).json({
                success: false,
                error: "Not Found",
                message: `No se encontró ningún activo con el ID ${id}.`
            });
        }
        auditLog(userId, "GET_ASSET_BY_ID", { assetId: id });
        return res.status(200).json({
            success: true,
            data: asset
        });
    } catch (error) {
        next(error);
    }
}

export async function updateAsset(req, res, next) {
    const { id } = req.params;
    const { nombre, categoria, estado } = req.body;
    const userId = req.user?.sub || req.user?.correo || "UNKNOWN_USER";

    if (!nombre || !categoria || !estado) {
        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: "Faltan campos obligatorios: nombre, categoria, estado."
        });
    }

    const validatedNombre = validateTextField(nombre, "nombre", 100);
    if (!validatedNombre.isValid) {
        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: validatedNombre.message
        });
    }

    const validatedCategoria = validateTextField(categoria, "categoria", 50);
    if (!validatedCategoria.isValid) {
        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: validatedCategoria.message
        });
    }

    const validatedEstado = validateTextField(estado, "estado", 20);
    if (!validatedEstado.isValid) {
        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: validatedEstado.message
        });
    }

    try {
        const asset = await activosService.updateAsset(id, validatedNombre.value, validatedCategoria.value, validatedEstado.value);
        if (!asset) {
            return res.status(404).json({
                success: false,
                error: "Not Found",
                message: `No se encontró ningún activo con el ID ${id}.`
            });
        }

        auditLog(userId, "UPDATE_ASSET", { assetId: id, nombre: validatedNombre.value, categoria: validatedCategoria.value, estado: validatedEstado.value });

        return res.status(200).json({
            success: true,
            message: "Activo actualizado exitosamente.",
            data: asset
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteAsset(req, res, next) {
    const { id } = req.params;
    const userId = req.user?.sub || req.user?.correo || "UNKNOWN_USER";
    try {
        const deleted = await activosService.deleteAsset(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: "Not Found",
                message: `No se encontró ningún activo con el ID ${id}.`
            });
        }

        auditLog(userId, "DELETE_ASSET", { assetId: id });

        return res.status(200).json({
            success: true,
            message: "Activo eliminado exitosamente."
        });
    } catch (error) {
        next(error);
    }
}
