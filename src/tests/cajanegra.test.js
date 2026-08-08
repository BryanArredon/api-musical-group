/**
 * ============================================================
 * PRUEBAS DE CAJA NEGRA — Musical Group API
 * ============================================================
 * Tipo de prueba : Caja Negra (Black-Box Testing)
 * Técnica        : Partición de equivalencia + Análisis de valores límite
 * Herramienta    : Jest v30 + Supertest v7
 * Componente     : API REST (Backend Node.js/Express)
 *
 * Descripción:
 *   Las pruebas de caja negra validan el comportamiento EXTERNO de la API
 *   a partir de sus entradas y salidas, sin conocimiento de la implementación
 *   interna. Se verifican únicamente los contratos HTTP: códigos de estado,
 *   estructura de respuesta y mensajes de error según la especificación.
 *
 * Particiones de equivalencia aplicadas:
 *   - Entradas VÁLIDAS   → HTTP 2xx + success: true
 *   - Entradas INVÁLIDAS → HTTP 4xx + success: false  (campos vacíos, tipos incorrectos)
 *   - Entradas LÍMITE    → HTTP 4xx + success: false  (strings vacíos, IDs no numéricos)
 *   - Sin autenticación  → HTTP 401
 *   - Sin autorización   → HTTP 403
 * ============================================================
 */

import { jest, describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../app.js";
import { pool } from "../config/database.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = "8a9b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Genera un JWT firmado con el rol y correo indicados */
function makeToken(roles = ["ROLE_ADMIN"], email = "admin@test.com") {
    return jwt.sign({ sub: email, correo: email, authorities: roles }, JWT_SECRET, { expiresIn: "1h" });
}

// ─── Setup: mock de base de datos ────────────────────────────────────────────

let mockClient;

beforeEach(() => {
    jest.clearAllMocks();

    mockClient = {
        query: jest.fn().mockImplementation((sql, params = []) => {
            if (["BEGIN", "COMMIT", "ROLLBACK"].some((k) => sql.includes(k))) {
                return Promise.resolve();
            }
            if (sql.includes("INSERT INTO activos")) {
                return Promise.resolve({
                    rows: [{ id: 1, categoria: params[2], estado: params[3], created_at: new Date(), updated_at: new Date() }]
                });
            }
            if (sql.includes("SELECT") && sql.includes("activos")) {
                const id = params?.[1] ?? params?.[0];
                if (String(id) === "9999") return Promise.resolve({ rows: [] });
                return Promise.resolve({
                    rows: [{ id: 1, nombre: "Guitarra", categoria: "Instrumentos", estado: "Disponible", created_at: new Date(), updated_at: new Date() }]
                });
            }
            return Promise.resolve({ rows: [] });
        }),
        release: jest.fn()
    };

    jest.spyOn(pool, "connect").mockResolvedValue(mockClient);
});

afterAll(() => jest.restoreAllMocks());

// ============================================================
// CN-01  Autenticación — sin token
// Partición: petición sin cabecera Authorization
// ============================================================
describe("CN-01 | Caja Negra — Acceso sin token de autenticación", () => {
    it("POST /api/activos sin token → 401 Unauthorized", async () => {
        // Datos de entrada: payload válido, SIN cabecera Authorization
        const res = await request(app)
            .post("/api/activos")
            .send({ nombre: "Batería", categoria: "Percusión", estado: "Disponible" });

        // Resultado esperado: rechazo con 401 y mensaje de error
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toBe("Unauthorized");
        expect(res.body.message).toMatch(/token/i);
    });

    it("GET /api/activos sin token → 401 Unauthorized", async () => {
        const res = await request(app).get("/api/activos");

        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toBe("Unauthorized");
    });

    it("GET /api/solicitudes/pendientes sin token → 401 Unauthorized", async () => {
        const res = await request(app).get("/api/solicitudes/pendientes");

        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });
});

// ============================================================
// CN-02  Autorización — rol insuficiente (ROLE_USER)
// Partición: token válido pero sin privilegios de administrador
// ============================================================
describe("CN-02 | Caja Negra — Acceso con rol insuficiente (ROLE_USER)", () => {
    it("POST /api/activos con ROLE_USER → 403 Forbidden", async () => {
        const token = makeToken(["ROLE_USER"], "colab@test.com");

        const res = await request(app)
            .post("/api/activos")
            .set("Authorization", `Bearer ${token}`)
            .send({ nombre: "Bajo", categoria: "Instrumentos", estado: "Disponible" });

        // Un colaborador NO puede crear activos → 403
        expect(res.statusCode).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toBe("Forbidden");
        expect(res.body.message).toMatch(/administrador/i);
    });

    it("GET /api/solicitudes/todas con ROLE_USER → 403 Forbidden", async () => {
        const token = makeToken(["ROLE_USER"]);

        const res = await request(app)
            .get("/api/solicitudes/todas")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(403);
        expect(res.body.success).toBe(false);
    });
});

// ============================================================
// CN-03  Validación de campos obligatorios — partición inválida
// Técnica: valores nulos / ausentes en el body
// ============================================================
describe("CN-03 | Caja Negra — Campos obligatorios faltantes en POST /api/activos", () => {
    const adminToken = () => makeToken(["ROLE_ADMIN"]);

    it("Sin campo 'nombre' → 400 Bad Request", async () => {
        const res = await request(app)
            .post("/api/activos")
            .set("Authorization", `Bearer ${adminToken()}`)
            .send({ categoria: "Instrumentos", estado: "Disponible" }); // falta nombre

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/nombre/i);
    });

    it("Sin campo 'categoria' → 400 Bad Request", async () => {
        const res = await request(app)
            .post("/api/activos")
            .set("Authorization", `Bearer ${adminToken()}`)
            .send({ nombre: "Trompeta", estado: "Disponible" }); // falta categoria

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/categoria/i);
    });

    it("Sin campo 'estado' → 400 Bad Request", async () => {
        const res = await request(app)
            .post("/api/activos")
            .set("Authorization", `Bearer ${adminToken()}`)
            .send({ nombre: "Violín", categoria: "Cuerdas" }); // falta estado

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/estado/i);
    });

    it("Body completamente vacío → 400 Bad Request", async () => {
        const res = await request(app)
            .post("/api/activos")
            .set("Authorization", `Bearer ${adminToken()}`)
            .send({});

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });
});

// ============================================================
// CN-04  Valores límite — ID no numérico / fuera de rango
// Técnica: análisis de valores límite en parámetros de ruta
// ============================================================
describe("CN-04 | Caja Negra — Valores límite en parámetro :id de activos", () => {
    const adminToken = () => makeToken(["ROLE_ADMIN"]);

    it("ID con letras ('abc') → 400 Bad Request", async () => {
        const res = await request(app)
            .get("/api/activos/abc")
            .set("Authorization", `Bearer ${adminToken()}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("ID cero (0) → 400 Bad Request", async () => {
        const res = await request(app)
            .get("/api/activos/0")
            .set("Authorization", `Bearer ${adminToken()}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("ID negativo (-1) → 400 Bad Request", async () => {
        const res = await request(app)
            .get("/api/activos/-1")
            .set("Authorization", `Bearer ${adminToken()}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("ID decimal (1.5) → 400 Bad Request", async () => {
        const res = await request(app)
            .get("/api/activos/1.5")
            .set("Authorization", `Bearer ${adminToken()}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });
});

// ============================================================
// CN-05  Partición válida — Creación exitosa de un activo
// Entrada: todos los campos correctos + token ADMIN
// ============================================================
describe("CN-05 | Caja Negra — Creación exitosa de activo (partición válida)", () => {
    it("POST /api/activos con datos válidos → 201 Created", async () => {
        const token = makeToken(["ROLE_ADMIN"]);

        const res = await request(app)
            .post("/api/activos")
            .set("Authorization", `Bearer ${token}`)
            .send({ nombre: "Guitarra Eléctrica", categoria: "Instrumentos", estado: "Disponible" });

        // Resultado esperado: 201 + success + data con el activo creado
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/exitosamente/i);
        expect(res.body.data).toBeDefined();
        expect(res.body.data).toHaveProperty("id");
        expect(res.body.data).toHaveProperty("categoria");
        expect(res.body.data).toHaveProperty("estado");
    });
});

// ============================================================
// CN-06  Detección de inyección — Scanner de seguridad
// Partición inválida: payload con patrones SQLi/XSS
// ============================================================
describe("CN-06 | Caja Negra — Bloqueo de patrones de inyección (Injection Scanner)", () => {
    const adminToken = () => makeToken(["ROLE_ADMIN"]);

    it("Payload con intento de SQL Injection → 400 Bad Request", async () => {
        const res = await request(app)
            .post("/api/activos")
            .set("Authorization", `Bearer ${adminToken()}`)
            .send({ nombre: "'; DROP TABLE activos; --", categoria: "Test", estado: "Disponible" });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("Payload con intento de XSS → 400 Bad Request", async () => {
        const res = await request(app)
            .post("/api/activos")
            .set("Authorization", `Bearer ${adminToken()}`)
            .send({ nombre: "<script>alert('xss')</script>", categoria: "Test", estado: "Disponible" });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });
});

// ============================================================
// CN-07  Ruta inexistente — comportamiento del API no definido
// Partición: endpoint que no existe en el enrutador
// ============================================================
describe("CN-07 | Caja Negra — Endpoint inexistente", () => {
    it("GET /api/ruta-que-no-existe → 404", async () => {
        const res = await request(app).get("/api/ruta-que-no-existe");

        // La app no debe exponer stack trace ni información interna
        expect(res.statusCode).toBe(404);
        expect(res.body).not.toHaveProperty("stack");
    });
});

// ============================================================
// CN-08  Solicitudes — campo activoId obligatorio
// Partición inválida: crear solicitud sin indicar el activo
// ============================================================
describe("CN-08 | Caja Negra — Validación de campo activoId en POST /api/solicitudes", () => {
    it("Sin activoId → 400 Bad Request", async () => {
        const token = makeToken(["ROLE_USER"], "colab@test.com");

        const res = await request(app)
            .post("/api/solicitudes")
            .set("Authorization", `Bearer ${token}`)
            .send({ comentarios: "Sin activo" }); // falta activoId

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/activoId/i);
    });

    it("Colaborador autenticado SÍ puede crear solicitud con activoId válido → 201", async () => {
        // Re-mock para INSERT en solicitudes
        mockClient.query.mockImplementation((sql, params = []) => {
            if (["BEGIN", "COMMIT", "ROLLBACK"].some((k) => sql.includes(k))) return Promise.resolve();
            if (sql.includes("SELECT id, estado FROM activos")) return Promise.resolve({ rows: [{ id: 1, estado: "Disponible" }] });
            if (sql.includes("INSERT INTO solicitudes")) {
                return Promise.resolve({
                    rows: [{ id: 10, colaborador_email: params[0], activo_id: params[1], estado: "Pendiente", comentarios: params[2] }]
                });
            }
            return Promise.resolve({ rows: [] });
        });

        const token = makeToken(["ROLE_USER"], "colab@test.com");

        const res = await request(app)
            .post("/api/solicitudes")
            .set("Authorization", `Bearer ${token}`)
            .send({ activoId: 1, comentarios: "Guitarra para concierto" });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.estado).toBe("Pendiente");
    });
});
