import { jest, describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../app.js";
import { pool } from "../config/database.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = "8a9b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b";

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

describe("Pruebas de Aprobación de Solicitudes (RF2-B)", () => {
    let mockClient;
    let connectSpy;

    beforeEach(() => {
        jest.clearAllMocks();

        mockClient = {
            query: jest.fn().mockImplementation((queryText, params) => {
                if (queryText.includes("BEGIN") || queryText.includes("COMMIT") || queryText.includes("ROLLBACK")) {
                    return Promise.resolve();
                }

                if (queryText.includes("perfiles")) {
                    return Promise.resolve({ rows: [{ id: 1 }] });
                }

                // Mock check if asset exists
                if (queryText.includes("SELECT id, estado FROM activos")) {
                    if (String(params[0]) === "999") {
                        return Promise.resolve({ rows: [] }); // Non-existent asset
                    }
                    if (String(params[0]) === "2") {
                        return Promise.resolve({ rows: [{ id: 2, estado: "Asignado" }] }); // Already assigned
                    }
                    return Promise.resolve({ rows: [{ id: 1, estado: "Disponible" }] });
                }

                // Mock check request
                if (queryText.includes("SELECT id, estado FROM solicitudes_v2") || queryText.includes("SELECT id, estado, activo_id FROM solicitudes")) {
                    if (String(params[0]) === "999" || String(params[0]).includes("999")) {
                        return Promise.resolve({ rows: [] }); // Non-existent request
                    }
                    if (String(params[0]) === "2" || String(params[0]) === "222e4567-e89b-12d3-a456-426614174000") {
                        return Promise.resolve({ rows: [{ id: "222e4567-e89b-12d3-a456-426614174000", estado: "Aprobada", activo_id: 1 }] }); // Already processed
                    }
                    return Promise.resolve({ rows: [{ id: "123e4567-e89b-12d3-a456-426614174000", estado: "Pendiente", activo_id: 1 }] });
                }

                // Mock insert request
                if (queryText.includes("INSERT INTO solicitudes_v2") || queryText.includes("INSERT")) {
                    return Promise.resolve({
                        rows: [{ id: "123e4567-e89b-12d3-a456-426614174000", colaborador_email: "colab@musical.com", estado: "Pendiente" }]
                    });
                }

                // Mock get pending
                if (queryText.includes("SELECT s.id, s.colaborador_email")) {
                    return Promise.resolve({
                        rows: [{ id: 1, colaborador_email: "colab@musical.com", activo_id: 1, estado: "Pendiente" }]
                    });
                }

                return Promise.resolve({ rows: [] });
            }),
            release: jest.fn()
        };

        connectSpy = jest.spyOn(pool, 'connect').mockResolvedValue(mockClient);
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    describe("Autenticación y RBAC", () => {
        it("Cualquier colaborador autenticado puede crear una solicitud", async () => {
            const token = generateToken(["ROLE_USER"], "colab@musical.com");
            const res = await request(app)
                .post("/api/solicitudes")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    activosIds: [1],
                    nombreEvento: "Ensayo general",
                    fechaInicio: "2026-08-10",
                    fechaFin: "2026-08-11"
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.colaborador_email).toBe("colab@musical.com");
        });

        it("Un usuario sin rol de administrador NO puede ver solicitudes pendientes", async () => {
            const token = generateToken(["ROLE_USER"]);
            const res = await request(app)
                .get("/api/solicitudes/pendientes")
                .set("Authorization", `Bearer ${token}`);

            expect(res.statusCode).toBe(403);
        });

        it("Un usuario sin rol de administrador NO puede aprobar ni rechazar solicitudes", async () => {
            const token = generateToken(["ROLE_USER"]);
            
            const approveRes = await request(app)
                .post("/api/solicitudes/123e4567-e89b-12d3-a456-426614174000/aprobar")
                .set("Authorization", `Bearer ${token}`);
            expect(approveRes.statusCode).toBe(403);

            const rejectRes = await request(app)
                .post("/api/solicitudes/123e4567-e89b-12d3-a456-426614174000/rechazar")
                .set("Authorization", `Bearer ${token}`);
            expect(rejectRes.statusCode).toBe(403);
        });
    });

    describe("Lógica de Aprobación y Rechazo (Admin)", () => {
        it("Debe permitir al administrador aprobar una solicitud pendiente y cambiar estado de activo", async () => {
            const token = generateToken(["ROLE_ADMIN"]);
            const res = await request(app)
                .post("/api/solicitudes/123e4567-e89b-12d3-a456-426614174000/aprobar")
                .set("Authorization", `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain("aprobada con éxito");

            // Verify both tables updated in the same transaction
            expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE solicitudes"), expect.any(Array));
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE activos"), expect.any(Array));
            expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
        });

        it("Debe permitir al administrador rechazar una solicitud pendiente sin alterar el activo", async () => {
            const token = generateToken(["ROLE_ADMIN"]);
            const res = await request(app)
                .post("/api/solicitudes/123e4567-e89b-12d3-a456-426614174000/rechazar")
                .set("Authorization", `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            
            expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE solicitudes"), expect.any(Array));
            // Should NOT update assets table on rejection
            expect(mockClient.query).not.toHaveBeenCalledWith(expect.stringContaining("UPDATE activos"), expect.any(Array));
            expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
        });

        it("Debe impedir procesar una solicitud que ya fue procesada anteriormente", async () => {
            const token = generateToken(["ROLE_ADMIN"]);
            const res = await request(app)
                .post("/api/solicitudes/222e4567-e89b-12d3-a456-426614174000/aprobar") // Solicitud 2 is mocked as already 'Aprobada'
                .set("Authorization", `Bearer ${token}`);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toContain("ya ha sido procesada previamente");
            expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
        });

        it("Debe impedir aprobar una solicitud si el activo ya está asignado a otra persona", async () => {
            const token = generateToken(["ROLE_ADMIN"]);
            
            // Mock that checks request returns asset ID 2 (which is already 'Asignado')
            mockClient.query.mockImplementation((queryText, params) => {
                if (queryText.includes("BEGIN") || queryText.includes("COMMIT") || queryText.includes("ROLLBACK")) {
                    return Promise.resolve();
                }
                if (queryText.includes("solicitudes_v2")) {
                    return Promise.resolve({ rows: [{ id: "123e4567-e89b-12d3-a456-426614174000", estado: "Pendiente" }] });
                }
                if (queryText.includes("solicitud_activos_v2")) {
                    return Promise.resolve({ rows: [{ activo_id: 2 }] });
                }
                if (queryText.includes("activos_v2")) {
                    return Promise.resolve({ rows: [{ id: 2, estado: "Asignado" }] });
                }
                return Promise.resolve({ rows: [] });
            });

            const res = await request(app)
                .post("/api/solicitudes/123e4567-e89b-12d3-a456-426614174000/aprobar")
                .set("Authorization", `Bearer ${token}`);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toContain("ya se encuentra asignado");
            expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
        });
    });
});
