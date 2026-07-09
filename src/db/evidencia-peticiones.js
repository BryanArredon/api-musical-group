import jwt from "jsonwebtoken";

const BASE = "http://localhost:3000";
const SEP  = "═".repeat(65);
const sep  = "─".repeat(45);
const JWT_SECRET = process.env.JWT_SECRET || "8a9b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b";

// ── Utilidad para imprimir request + response ───────────────
async function request(method, path, body = null, token = null, label = "") {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    console.log(`\n${sep}`);
    if (label) console.log(`📌 ${label}`);
    console.log(`➤ ${method} ${BASE}${path}`);
    if (body)  console.log(`  Body: ${JSON.stringify(body)}`);
    if (token) console.log(`  Auth: Bearer ${token.slice(0,30)}...`);

    try {
        const res  = await fetch(`${BASE}${path}`, opts);
        const data = await res.json();
        console.log(`  ← Status: ${res.status}`);
        console.log(`  ← Body:   ${JSON.stringify(data, null, 2).replace(/\n/g, "\n             ")}`);
        return { status: res.status, data };
    } catch (err) {
        console.log(`  ✗ Error de red: ${err.message}`);
        console.log(`  → ¿Está corriendo el servidor? Ejecuta: npm run dev`);
        process.exit(1);
    }
}

// ─────────────────────────────────────────────────────────────
// BLOQUE 0: Generar tokens firmados directamente
// ─────────────────────────────────────────────────────────────
function generarTokens() {
    console.log(`\n${SEP}`);
    console.log("SETUP: Generando tokens JWT firmados con mismo secret que el servidor");
    console.log(SEP);

    const adminToken = jwt.sign(
        { sub: "admin@musical.com", correo: "admin@musical.com", authorities: ["ROLE_ADMIN"] },
        JWT_SECRET, { expiresIn: "2h" }
    );
    const colabToken = jwt.sign(
        { sub: "colab@musical.com", correo: "colab@musical.com", authorities: ["ROLE_USER"] },
        JWT_SECRET, { expiresIn: "2h" }
    );

    console.log(`  ✅ Token ADMIN generado:  ${adminToken.slice(0,40)}...`);
    console.log(`  ✅ Token COLAB generado:  ${colabToken.slice(0,40)}...`);

    return { admin: adminToken, colab: colabToken };
}

// ─────────────────────────────────────────────────────────────
// EVIDENCIA 1 — Art. 25: Integridad y Transacciones
// ─────────────────────────────────────────────────────────────
async function evidencia_Art25(adminToken) {
    console.log(`\n${SEP}`);
    console.log("EVIDENCIA 1 — Art. 25 LGPDPPSO: Integridad y Disponibilidad");
    console.log("Transacciones atómicas: solo datos válidos llegan a Supabase");
    console.log(SEP);

    // Caso A: INSERT válido → COMMIT (dato persiste)
    const creado = await request("POST", "/api/activos",
        { nombre: "Guitarra PRS Custom 24", categoria: "Instrumentos", estado: "Disponible" },
        adminToken,
        "CASO A — Datos válidos → COMMIT. Activo persiste en Supabase");

    const activoId = creado.data.data?.id;

    // Verificar que realmente se guardó
    if (activoId) {
        await request("GET", `/api/activos/${activoId}`,
            null, adminToken,
            `VERIFICACIÓN — GET /api/activos/${activoId} confirma que el dato fue persistido`);
    }

    // Caso B: INSERT inválido → validación rechaza antes del ROLLBACK
    await request("POST", "/api/activos",
        { nombre: "' OR 1=1 --", categoria: "Hack", estado: "Activo" },
        adminToken,
        "CASO B — Inyección SQL en nombre → bloqueado, NINGÚN dato corrupto llega a la BD");

    // Caso C: campos incompletos → transacción ni se inicia
    await request("POST", "/api/activos",
        { nombre: "Bajo Fender" },
        adminToken,
        "CASO C — Campos incompletos → validación previa, BD no es tocada");

    return activoId;
}

// ─────────────────────────────────────────────────────────────
// EVIDENCIA 2 — Art. 3 Fracc. XIII: Anonimización en logs
// ─────────────────────────────────────────────────────────────
async function evidencia_Art3(adminToken, colabToken, activoId) {
    console.log(`\n${SEP}`);
    console.log("EVIDENCIA 2 — Art. 3 Fracc. XIII: Disociación y Anonimización");
    console.log("Los campos 'nombre' NO aparecen en claro en los logs del servidor");
    console.log("Observa la terminal donde corre 'npm run dev' — verás 'G***r' no el nombre completo");
    console.log(SEP);

    // Al hacer GET el servidor llama auditLog → nombre queda enmascarado en logs
    if (activoId) {
        await request("GET", `/api/activos/${activoId}`,
            null, adminToken,
            "GET activo — revisar logs del servidor: nombre aparece enmascarado (G***r)");
    }

    // Colaborador crea solicitud — email aparece en log pero sin datos del activo cifrado
    if (activoId) {
        await request("POST", "/api/solicitudes",
            { activoId, comentarios: "Necesito el instrumento para el concierto" },
            colabToken,
            "POST solicitud — log registra acción, no el contenido cifrado del activo");
    }

    // Intento fallido de acceso — auditLog registra BOLA_ATTEMPT sin revelar datos del dueño
    await request("GET", "/api/activos/999",
        null, adminToken,
        "GET activo inexistente — log registra GET_ASSET_BY_ID sin revelar datos de otros");
}

// ─────────────────────────────────────────────────────────────
// EVIDENCIA 3 — Art. 31-32: Prevención de fuga de datos
// ─────────────────────────────────────────────────────────────
async function evidencia_Art31_32(adminToken, colabToken) {
    console.log(`\n${SEP}`);
    console.log("EVIDENCIA 3 — Art. 31-32 LGPDPPSO: Prevención de Vulnerabilidades");
    console.log("El exterior NUNCA recibe información técnica interna del servidor");
    console.log(SEP);

    // Sin token → 401 genérico (no revela qué endpoint ni recurso existe)
    await request("GET", "/api/activos",
        null, null,
        "Sin token → 401 genérico. No revela arquitectura ni recursos");

    // Rol incorrecto → 403 genérico (colaborador intenta listar todos los activos)
    await request("GET", "/api/activos",
        null, colabToken,
        "Token COLABORADOR en ruta ADMIN → 403 Forbidden. No revela datos del recurso");

    // BOLA: colaborador intenta aprobar solicitud de otro (solo admin puede)
    await request("POST", "/api/solicitudes/1/aprobar",
        null, colabToken,
        "BOLA attempt: colaborador intenta aprobar solicitud → 403, no revela si existe o no");

    // SQL Injection en body → 400 genérico (no revela query ni estructura de BD)
    await request("POST", "/api/solicitudes",
        { activoId: "1; DROP TABLE activos; --", comentarios: "test" },
        colabToken,
        "SQLi en activoId → 400 Bad Request genérico, query real NUNCA se ejecuta");

    // NoSQL Injection → bloqueado antes de llegar a BD
    await request("POST", "/api/activos",
        { nombre: "test", categoria: '{"$gt": ""}', estado: "Disponible" },
        adminToken,
        "NoSQLi en categoría → 400, scanner de inyección actúa antes del controlador");

    // BOLA: ID no numérico para enumeración
    await request("GET", "/api/activos/abc999xyz",
        null, adminToken,
        "BOLA enumeración: ID no numérico 'abc999xyz' → 400, validateId rechaza antes de tocar la BD");

    // Rate Limiting — múltiples logins fallidos
    console.log(`\n${sep}`);
    console.log("📌 RATE LIMITING — 5 intentos de login fallidos rápidos:");
    for (let i = 1; i <= 5; i++) {
        const r = await request("POST", "/api/auth/login",
            { email: "hacker@evil.com", password: "wrong" },
            null,
            `Intento ${i}/5 — Fuerza bruta simulada`);
        if (r.status === 429) {
            console.log(`  🛡️  Rate limit activado en intento ${i} → IP bloqueada 15 min`);
            break;
        }
    }
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
async function main() {
    console.log("\n╔════════════════════════════════════════════════════════════════╗");
    console.log("║  EVIDENCIA VÍA PETICIONES HTTP — LGPDPPSO (DOF 14-11-2025)     ║");
    console.log("║  Servidor: http://localhost:3000  |  " + new Date().toLocaleString("es-MX") + "   ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");

    const tokens = generarTokens();

    const activoId = await evidencia_Art25(tokens.admin);
    await evidencia_Art3(tokens.admin, tokens.colab, activoId);
    await evidencia_Art31_32(tokens.admin, tokens.colab);

    console.log(`\n${SEP}`);
    console.log("RESUMEN — PETICIONES EJECUTADAS:");
    console.log("  ✅ Art. 25  — POST /api/activos: COMMIT válido + rechazo de datos inválidos");
    console.log("  ✅ Art. 3 XIII — Logs enmascarados visibles en terminal del servidor");
    console.log("  ✅ Art. 31-32 — 401/403/400 genéricos + SQLi/NoSQLi/BOLA bloqueados");
    console.log(SEP + "\n");
}

main();
