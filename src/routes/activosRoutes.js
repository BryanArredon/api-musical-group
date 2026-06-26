import { Router } from "express";
import * as activosController from "../controllers/activosController.js";
import { requireAdmin } from "../middlewares/auth.js";

const router = Router();

// Secure all CRUD endpoints with requireAdmin RBAC check
router.use(requireAdmin);

router.post("/", activosController.createAsset);
router.get("/", activosController.getAllAssets);
router.get("/:id", activosController.getAssetById);
router.put("/:id", activosController.updateAsset);
router.delete("/:id", activosController.deleteAsset);

export default router;
