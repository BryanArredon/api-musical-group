import { Router } from "express";
import * as authController from "../controllers/authController.js";

const router = Router();

// Endpoint for logging in
router.post("/login", authController.login);

export default router;