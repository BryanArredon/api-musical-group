import jwt from "jsonwebtoken";

const JWT_SECRET = "8a9b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b";

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
