import * as activosService from "../services/activosService.js";
import { auditLog } from "../utils/logger.js";
import { validateTextField, validateId } from "../utils/securityValidation.js";
import { sanitizeAsset, sanitizeList } from "../utils/responseSanitizer.js";

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
            data: sanitizeList(assets, sanitizeAsset) // [Mass Exposure] Only expose allowed fields
        });
    } catch (error) {
        next(error);
    }
}

export async function getAssetById(req, res, next) {
    const { id } = req.params;
    const userId = req.user?.sub || req.user?.correo || "UNKNOWN_USER";

    // [BOLA] Validate ID is a positive integer — reject enumeration via non-numeric IDs
    const validId = validateId(id);
    if (!validId.isValid) {
        return res.status(400).json({ success: false, error: "Bad Request", message: validId.message });
    }

    try {
        const asset = await activosService.getAssetById(validId.value);
        if (!asset) {
            return res.status(404).json({
                success: false,
                error: "Not Found",
                message: "No se encontró ningún activo con el ID proporcionado." // [Mass Exposure] Don't echo back user-supplied IDs
            });
        }
        auditLog(userId, "GET_ASSET_BY_ID", { assetId: validId.value });
        return res.status(200).json({
            success: true,
            data: sanitizeAsset(asset) // [Mass Exposure] Only expose allowed fields
        });
    } catch (error) {
        next(error);
    }
}

export async function updateAsset(req, res, next) {
    const { id } = req.params;
    const { nombre, categoria, estado } = req.body;
    const userId = req.user?.sub || req.user?.correo || "UNKNOWN_USER";

    // [BOLA] Validate ID is a positive integer
    const validId = validateId(id);
    if (!validId.isValid) {
        return res.status(400).json({ success: false, error: "Bad Request", message: validId.message });
    }

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
        const asset = await activosService.updateAsset(validId.value, validatedNombre.value, validatedCategoria.value, validatedEstado.value);
        if (!asset) {
            return res.status(404).json({
                success: false,
                error: "Not Found",
                message: "No se encontró ningún activo con el ID proporcionado."
            });
        }

        auditLog(userId, "UPDATE_ASSET", { assetId: validId.value, nombre: validatedNombre.value, categoria: validatedCategoria.value, estado: validatedEstado.value });

        return res.status(200).json({
            success: true,
            message: "Activo actualizado exitosamente.",
            data: sanitizeAsset(asset) // [Mass Exposure] Only expose allowed fields
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteAsset(req, res, next) {
    const { id } = req.params;
    const userId = req.user?.sub || req.user?.correo || "UNKNOWN_USER";

    // [BOLA] Validate ID is a positive integer
    const validId = validateId(id);
    if (!validId.isValid) {
        return res.status(400).json({ success: false, error: "Bad Request", message: validId.message });
    }

    try {
        const deleted = await activosService.deleteAsset(validId.value);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: "Not Found",
                message: "No se encontró ningún activo con el ID proporcionado."
            });
        }

        auditLog(userId, "DELETE_ASSET", { assetId: validId.value });

        return res.status(200).json({
            success: true,
            message: "Activo eliminado exitosamente."
        });
    } catch (error) {
        next(error);
    }
}
