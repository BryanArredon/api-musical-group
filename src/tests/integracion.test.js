/**
 * ============================================================
 * PRUEBAS DE INTEGRACIÓN — Musical Group API
 * ============================================================
 * Tipo de prueba : Integración (Integration Testing)
 * Técnica        : Integración de módulos en capas (Top-Down)
 *                  Verificación de flujos extremo a extremo entre
 *                  Middleware → Router → Controller → Service → DB
 * Herramienta    : Jest v30 + Supertest v7
 * Componente     : API REST — flujos completos de negocio
 *
 * Descripción:
 *   Valida que los módulos del sistema trabajen correctamente
 *   en conjunto. Se prueba la cadena completa de una petición HTTP:
 *   autenticación JWT, aplicación de RBAC, lógica de negocio en
 *   el service layer, transacciones ACID en la DB y la respuesta
 *   final al cliente.
 *
 *   Diferencia con caja negra: aquí se verifica el COMPORTAMIENTO
 *   INTERNO de la integración (ej. que BEGIN/COMMIT/ROLLBACK se
 *   invoquen en el orden correcto entre módulos).
 * ============================================================
 */

import { jest, describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../app.js";
import { pool } from "../config/database.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = "8a9b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b";

function makeToken(roles = ["ROLE_ADMIN"], email = "admin@test.com") {
    return jwt.sign({ sub: email, correo: email, authorities: roles }, JWT_SECRET, { expiresIn: "1h" });
}

// ─── Setup global del mock de DB ─────────────────────────────────────────────

let mockClient;

beforeEach(() => {
    jest.clearAllMocks();

    mockClient = {
        query: jest.fn(),
        release: jest.fn()
    };

    jest.spyOn(pool, "connect").mockResolvedValue(mockClient);
});

afterAll(() => jest.restoreAllMocks());

// ─── Helpers de mock reutilizables ───────────────────────────────────────────

/** Mock para flujo de creación exitosa de activo */
function mockActivoCreacion() {
    mockClient.query.mockImplementation((sql, params = []) => {
        if (["BEGIN", "COMMIT"].some((k) => sql.includes(k))) return Promise.resolve();
        if (sql.includes("INSERT INTO activos")) {
            return Promise.resolve({
                rows: [{ id: 42, categoria: params[2], estado: params[3], created_at: new Date(), updated_at: new Date() }]
            });
        }
        return Promise.resolve({ rows: [] });
    });
}

/** Mock para flujo de aprobación de solicitud con activo disponible */
function mockAprobacionExitosa() {
    mockClient.query.mockImplementation((sql, params = []) => {
        if (["BEGIN", "COMMIT"].some((k) => sql.includes(k))) return Promise.resolve();
        if (sql.includes("SELECT id, estado, activo_id FROM solicitudes")) {
            return Promise.resolve({ rows: [{ id: 1, estado: "Pendiente", activo_id: 5 }] });
        }
        if (sql.includes("SELECT id, estado FROM activos")) {
            return Promise.resolve({ rows: [{ id: 5, estado: "Disponible" }] });
        }
        if (sql.includes("UPDATE solicitudes")) return Promise.resolve({ rows: [] });
        if (sql.includes("UPDATE activos")) return Promise.resolve({ rows: [] });
        return Promise.resolve({ rows: [] });
    });
}

// ============================================================
// INT-01  Integración Middleware ↔ Router ↔ Controller
//         Flujo: JWT → RBAC → lógica de negocio completa
// ============================================================
describe("INT-01 | Integración — Flujo completo: Auth Middleware → Controller → Service → DB", () => {
    it("Token ADMIN válido pasa todos los middlewares y crea activo con transacción ACID", async () => {
        mockActivoCreacion();
        const token = makeToken(["ROLE_ADMIN"]);

        const res = await request(app)
            .post("/api/activos")
            .set("Authorization", `Bearer ${token}`)
            .send({ nombre: "Saxofón Alto", categoria: "Vientos", estado: "Disponible" });

        // ─── Verificar respuesta HTTP correcta ────────────
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("id");

        // ─── Verificar integración con DB: orden de llamadas ACID ─
        const calls = mockClient.query.mock.calls.map((c) => c[0]);
        const beginIdx  = calls.findIndex((s) => s.includes("BEGIN"));
        const insertIdx = calls.findIndex((s) => s.includes("INSERT"));
        const commitIdx = calls.findIndex((s) => s.includes("COMMIT"));

        // BEGIN debe ocurrir ANTES que INSERT, y COMMIT al final
        expect(beginIdx).toBeLessThan(insertIdx);
        expect(insertIdx).toBeLessThan(commitIdx);
        expect(calls).not.toContain(expect.stringContaining("ROLLBACK"));

        // Connection siempre debe liberarse (pool management)
        expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
});

// ============================================================
// INT-02  Integración: Flujo de aprobación de solicitud
//         Verifica que aprobación actualiza TANTO solicitudes
//         COMO activos dentro de la misma transacción
// ============================================================
describe("INT-02 | Integración — Aprobación de solicitud actualiza solicitud y activo atómicamente", () => {
    it("POST /api/solicitudes/:id/aprobar → actualiza 2 tablas en la misma transacción", async () => {
        mockAprobacionExitosa();
        const token = makeToken(["ROLE_ADMIN"]);

        const res = await request(app)
            .post("/api/solicitudes/1/aprobar")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/aprobada/i);

        const calls = mockClient.query.mock.calls.map((c) => c[0]);

        // Se deben haber ejecutado UPDATE en ambas tablas dentro de la misma transacción
        const updatedSolicitudes = calls.some((s) => s.includes("UPDATE solicitudes"));
        const updatedActivos     = calls.some((s) => s.includes("UPDATE activos"));
        const committed          = calls.some((s) => s.includes("COMMIT"));

        expect(updatedSolicitudes).toBe(true);
        expect(updatedActivos).toBe(true);
        expect(committed).toBe(true);
    });
});

// ============================================================
// INT-03  Integración: ROLLBACK automático cuando falla la DB
//         Verifica que el Service Layer hace rollback si el
//         INSERT/UPDATE lanza un error inesperado
// ============================================================
describe("INT-03 | Integración — ROLLBACK automático ante fallo de base de datos", () => {
    it("Error en INSERT → ROLLBACK ejecutado y respuesta 500", async () => {
        mockClient.query.mockImplementation((sql) => {
            if (sql.includes("BEGIN"))    return Promise.resolve();
            if (sql.includes("INSERT"))   return Promise.reject(new Error("Simulated DB failure"));
            if (sql.includes("ROLLBACK")) return Promise.resolve();
            return Promise.resolve({ rows: [] });
        });

        const token = makeToken(["ROLE_ADMIN"]);

        const res = await request(app)
            .post("/api/activos")
            .set("Authorization", `Bearer ${token}`)
            .send({ nombre: "FalloTest", categoria: "Test", estado: "Disponible" });

        expect(res.statusCode).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toBe("Internal Server Error");

        // ROLLBACK debe haberse invocado (integración Service ↔ DB)
        const calls = mockClient.query.mock.calls.map((c) => c[0]);
        expect(calls.some((s) => s.includes("ROLLBACK"))).toBe(true);
        expect(calls.some((s) => s.includes("COMMIT"))).toBe(false);

        // La conexión siempre se libera, incluso con error
        expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
});

// ============================================================
// INT-04  Integración: Flujo de rechazo de solicitud
//         El activo NO debe cambiar de estado al rechazar
// ============================================================
describe("INT-04 | Integración — Rechazo de solicitud NO modifica el activo", () => {
    it("POST /api/solicitudes/:id/rechazar → solo actualiza tabla solicitudes", async () => {
        mockClient.query.mockImplementation((sql) => {
            if (["BEGIN", "COMMIT"].some((k) => sql.includes(k))) return Promise.resolve();
            if (sql.includes("SELECT id, estado, activo_id FROM solicitudes")) {
                return Promise.resolve({ rows: [{ id: 1, estado: "Pendiente", activo_id: 5 }] });
            }
            if (sql.includes("UPDATE solicitudes")) return Promise.resolve({ rows: [] });
            return Promise.resolve({ rows: [] });
        });

        const token = makeToken(["ROLE_ADMIN"]);

        const res = await request(app)
            .post("/api/solicitudes/1/rechazar")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/rechazada/i);

        const calls = mockClient.query.mock.calls.map((c) => c[0]);

        // Solicitud actualizada ✓
        expect(calls.some((s) => s.includes("UPDATE solicitudes"))).toBe(true);
        // Activo NO debe modificarse al rechazar ✗
        expect(calls.some((s) => s.includes("UPDATE activos"))).toBe(false);
        expect(calls.some((s) => s.includes("COMMIT"))).toBe(true);
    });
});

// ============================================================
// INT-05  Integración: Regla de negocio — solicitud ya procesada
//         Verifica que el flujo de validación de estado se
//         integra correctamente entre controller y service
// ============================================================
describe("INT-05 | Integración — Regla de negocio: no procesar solicitud ya procesada", () => {
    it("Intentar aprobar solicitud con estado 'Aprobada' → 400 + ROLLBACK", async () => {
        mockClient.query.mockImplementation((sql) => {
            if (["BEGIN", "ROLLBACK"].some((k) => sql.includes(k))) return Promise.resolve();
            if (sql.includes("SELECT id, estado, activo_id FROM solicitudes")) {
                // Simulamos solicitud ya aprobada previamente
                return Promise.resolve({ rows: [{ id: 2, estado: "Aprobada", activo_id: 5 }] });
            }
            return Promise.resolve({ rows: [] });
        });

        const token = makeToken(["ROLE_ADMIN"]);

        const res = await request(app)
            .post("/api/solicitudes/2/aprobar")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/ya ha sido procesada/i);

        // ROLLBACK debe ejecutarse porque la transacción fue abortada
        const calls = mockClient.query.mock.calls.map((c) => c[0]);
        expect(calls.some((s) => s.includes("ROLLBACK"))).toBe(true);
        expect(calls.some((s) => s.includes("COMMIT"))).toBe(false);
    });
});

// ============================================================
// INT-06  Integración: Flujo de devolución de activo
//         Verifica la integración entre solicitudes, activos e
//         historial_devoluciones (3 tablas en 1 transacción)
// ============================================================
describe("INT-06 | Integración — Devolución de activo actualiza 3 tablas en una transacción", () => {
    it("POST /api/solicitudes/:id/devolver con condición física → 200 y 3 operaciones en DB", async () => {
        mockClient.query.mockImplementation((sql) => {
            if (["BEGIN", "COMMIT"].some((k) => sql.includes(k))) return Promise.resolve();
            if (sql.includes("SELECT id, estado, activo_id, colaborador_email FROM solicitudes")) {
                return Promise.resolve({ rows: [{ id: 3, estado: "Aprobada", activo_id: 7, colaborador_email: "colab@test.com" }] });
            }
            if (sql.includes("UPDATE solicitudes")) return Promise.resolve({ rows: [] });
            if (sql.includes("INSERT INTO historial_devoluciones")) return Promise.resolve({ rows: [] });
            if (sql.includes("UPDATE activos")) return Promise.resolve({ rows: [] });
            return Promise.resolve({ rows: [] });
        });

        const token = makeToken(["ROLE_ADMIN"]);

        const res = await request(app)
            .post("/api/solicitudes/3/devolver")
            .set("Authorization", `Bearer ${token}`)
            .send({ condicionesFisicas: "Guitarra devuelta en perfecto estado, sin daños visibles." });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/devoluci/i);

        const calls = mockClient.query.mock.calls.map((c) => c[0]);

        // Las 3 integraciones con DB deben haberse ejecutado
        expect(calls.some((s) => s.includes("UPDATE solicitudes"))).toBe(true);
        expect(calls.some((s) => s.includes("INSERT INTO historial_devoluciones"))).toBe(true);
        expect(calls.some((s) => s.includes("UPDATE activos"))).toBe(true);
        expect(calls.some((s) => s.includes("COMMIT"))).toBe(true);
    });

    it("Devolución sin condicionesFisicas → 400 y transacción no iniciada", async () => {
        const token = makeToken(["ROLE_ADMIN"]);

        const res = await request(app)
            .post("/api/solicitudes/3/devolver")
            .set("Authorization", `Bearer ${token}`)
            .send({}); // sin campo condicionesFisicas

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/condicionesFisicas/i);

        // No se debe haber conectado a la DB si falla validación previa
        expect(mockClient.query).not.toHaveBeenCalled();
    });
});

// ============================================================
// INT-07  Integración: Health check y disponibilidad del API
//         Verifica que el endpoint de monitoreo responde sin DB
// ============================================================
describe("INT-07 | Integración — Health Check del API", () => {
    it("GET /api/health → 200 OK sin autenticación ni DB", async () => {
        const res = await request(app).get("/api/health");

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/funcionando/i);

        // El health check nunca debe tocar la base de datos
        expect(mockClient.query).not.toHaveBeenCalled();
    });
});
