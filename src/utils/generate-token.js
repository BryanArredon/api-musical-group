// ============================================================
// generate-token.js — Solo para pruebas y evidencia técnica
// NUNCA exponer este archivo en producción
// ============================================================
import jwt from "jsonwebtoken";

// ✅ SEMGREP FIX: No hardcodear secretos — siempre desde .env
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("❌ JWT_SECRET no está definido en .env");
    process.exit(1);
}

const adminToken = jwt.sign(
    { sub: "admin@musical.com", correo: "admin@musical.com", authorities: ["ROLE_ADMIN"] },
    JWT_SECRET,
    { expiresIn: "10h" }
);

const colabToken = jwt.sign(
    { sub: "colaborador@musical.com", correo: "colaborador@musical.com", authorities: ["ROLE_USER"] },
    JWT_SECRET,
    { expiresIn: "10h" }
);

console.log("======================= ADMIN JWT (ROLE_ADMIN) =======================");
console.log(adminToken);
console.log("\n==================== COLLABORATOR JWT (ROLE_USER) ====================");
console.log(colabToken);
