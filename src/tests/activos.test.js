import { jest, describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../app.js";
import { pool } from "../config/database.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = "8a9b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b";

// Helper to generate test JWT token
function generateToken(roles = ["ROLE_ADMIN"], email = "admin@musical.com") {
    return jwt.sign(
        {
            sub: email,
            correo: email,
            authorities: roles
        },
        JWT_SECRET,
        { expiresIn: "1h" }
    );
}

describe("Pruebas de Integración y Seguridad - Activos", () => {
    let mockClient;
    let connectSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockClient = {
            query: jest.fn().mockImplementation((queryText, params) => {
                if (queryText.includes("BEGIN") || queryText.includes("COMMIT") || queryText.includes("ROLLBACK")) {
                    return Promise.resolve();
                }
                if (queryText.includes("SELECT id FROM categorias")) {
                    return Promise.resolve({ rows: [{ id: 1 }] });
                }
                if (queryText.includes("INSERT")) {
                    return Promise.resolve({
                        rows: [{ id: 1, categoria: "Instrumentos", estado: "Nuevo", created_at: new Date(), updated_at: new Date() }]
                    });
                }
                if (queryText.includes("SELECT")) {
                    return Promise.resolve({
                        rows: [{ id: 1, nombre: "Guitarra", categoria: "Instrumentos", estado: "Nuevo" }]
                    });
                }
                return Promise.resolve({ rows: [] });
            }),
            release: jest.fn()
        };

        // Spy on pool.connect and mock its behavior
        connectSpy = jest.spyOn(pool, 'connect').mockResolvedValue(mockClient);
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    describe("Autenticación y RBAC (Middleware)", () => {
        it("Debe denegar acceso (401) si no se proporciona token", async () => {
            const res = await request(app).get("/api/activos");
            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe("Unauthorized");
        });

        it("Debe permitir acceso (200) si el usuario no tiene rol de Administrador (filtro aplicado)", async () => {
            const token = generateToken(["ROLE_USER"]);
            const res = await request(app)
                .get("/api/activos")
                .set("Authorization", `Bearer ${token}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it("Debe permitir acceso (200) si el usuario es Administrador", async () => {
            const token = generateToken(["ROLE_ADMIN"]);
            const res = await request(app)
                .get("/api/activos")
                .set("Authorization", `Bearer ${token}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe("Operaciones CRUD y Transaccionalidad Atómica (Rollback)", () => {
        it("Debe crear un activo de forma exitosa y confirmar con HTTP 201", async () => {
            const token = generateToken(["ROLE_ADMIN"]);
            const res = await request(app)
                .post("/api/activos")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    nombre: "Batería",
                    categoria: "Percusión",
                    estado: "Nuevo"
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain("exitosamente");
            
            // Check atomic transaction commands
            expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
            expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
            expect(mockClient.query).not.toHaveBeenCalledWith("ROLLBACK");
            expect(mockClient.release).toHaveBeenCalled();
        });

        it("Debe realizar ROLLBACK automático ante un fallo en la base de datos", async () => {
            const token = generateToken(["ROLE_ADMIN"]);
            
            // Force query error inside transaction
            mockClient.query.mockImplementation((queryText) => {
                if (queryText.includes("BEGIN")) return Promise.resolve();
                if (queryText.includes("INSERT")) return Promise.reject(new Error("Database error"));
                if (queryText.includes("ROLLBACK")) return Promise.resolve();
                return Promise.resolve();
            });

            const res = await request(app)
                .post("/api/activos")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    nombre: "Fallo",
                    categoria: "Fallo",
                    estado: "Fallo"
                });

            expect(res.statusCode).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe("Internal Server Error");
            
            // Validate rollback was triggered on database client
            expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
            expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
            expect(mockClient.query).not.toHaveBeenCalledWith("COMMIT");
            expect(mockClient.release).toHaveBeenCalled();
        });
    });
});
