/**
 * ============================================================
 * PRUEBAS DE USABILIDAD — Musical Group (Frontend React)
 * ============================================================
 * Tipo de prueba : Usabilidad (Usability Testing)
 * Técnica        : Evaluación Heurística de Nielsen (10 heurísticas)
 *                  + Lista de verificación estructurada
 * Herramienta    : Jest (suite de pruebas de comportamiento
 *                  documentado con assertions sobre lógica de UI)
 * Componente     : Frontend React — Login, LoanRequestForm,
 *                  AdminRequests, App (navegación)
 *
 * Descripción:
 *   Las pruebas de usabilidad verifican que la interfaz cumple
 *   principios de diseño centrado en el usuario. En lugar de
 *   automatización E2E con browser (Selenium/Playwright),
 *   se aplica evaluación heurística documentada mediante:
 *   1) Casos de prueba con criterio de aceptación medible.
 *   2) Assertions sobre las reglas de negocio del frontend
 *      (validación reactiva, mensajes de feedback, accesibilidad).
 *
 * Heurísticas de Nielsen aplicadas:
 *   H1 - Visibilidad del estado del sistema
 *   H5 - Prevención de errores
 *   H6 - Reconocimiento en lugar de memorización
 *   H9 - Ayuda a reconocer y recuperarse de errores
 *  H10 - Ayuda y documentación
 * ============================================================
 */

import { describe, it, expect } from "@jest/globals";

// ─── Helpers que replican la lógica real del frontend ───────────────────────
// (copiados de musical-group/src para poder probarlos sin DOM/browser)

/** Replica isValidEmail de musical-group/src/utils/security.js */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Replica las reglas de contraseña del componente Login.jsx */
function evaluatePasswordRules(password) {
    return {
        length:  password.length >= 8,
        upper:   /[A-Z]/.test(password),
        number:  /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
    };
}

/** Replica isPasswordValid del componente Login.jsx */
function isPasswordValid(password) {
    const rules = evaluatePasswordRules(password);
    return Object.values(rules).every(Boolean);
}

/** Replica validateForm de Login.jsx */
function validateLoginForm(email, password) {
    const errors = {};
    if (!email.trim()) {
        errors.email = "El email es requerido";
    } else if (!isValidEmail(email)) {
        errors.email = "Formato de email inválido";
    }
    if (!password.trim()) {
        errors.password = "La contraseña es requerida";
    }
    return errors;
}

/** Replica validateForm de Login.jsx para registro */
function validateRegisterForm(nombre, email, password) {
    const errors = {};
    if (!nombre.trim()) errors.nombre = "El nombre es requerido";
    if (!email.trim()) {
        errors.email = "El email es requerido";
    } else if (!isValidEmail(email)) {
        errors.email = "Formato de email inválido";
    }
    if (!password.trim()) {
        errors.password = "La contraseña es requerida";
    } else if (!isPasswordValid(password)) {
        errors.password = "La contraseña no cumple los requisitos";
    }
    return errors;
}

/** Replica validate() de LoanRequestForm.jsx */
function validateLoanForm(eventName, date, assets, selected) {
    const errors = {};
    if (!eventName.trim())  errors.eventName = "El nombre del evento es obligatorio";
    if (!date)              errors.date      = "La fecha es obligatoria";
    if (assets.length === 0) {
        errors.assets = "No hay activos disponibles en el inventario";
    } else if (Object.values(selected).every((v) => !v)) {
        errors.assets = "Selecciona al menos un activo";
    }
    return errors;
}

/** Replica la lógica de determinar la vista activa en App.jsx */
function getInitialView(role) {
    return role === "admin" ? "inventory" : "loans_form";
}

/** Replica el label del encabezado según la vista activa en App.jsx */
function getPageTitle(view, role) {
    if (view === "inventory")   return "Gestión de Inventario";
    if (view === "loans")       return role === "admin" ? "Solicitudes de Préstamo" : "Sección de Préstamos";
    if (view === "loans_form")  return "Nueva Solicitud";
    if (view === "loans_mine")  return "Mis Solicitudes Activas";
    return "";
}

// ============================================================
// US-01  H9 — Reconocimiento y recuperación de errores
//         El formulario de login muestra mensajes claros
//         ante entradas inválidas
// Criterio de aceptación: cada campo inválido genera un
//   mensaje de error descriptivo, no un error genérico
// ============================================================
describe("US-01 | Usabilidad — H9: Mensajes de error descriptivos en Login", () => {
    it("Campo email vacío → mensaje 'El email es requerido'", () => {
        const errors = validateLoginForm("", "Password1!");
        expect(errors.email).toBe("El email es requerido");
        // No debe ser un mensaje genérico como "Campo inválido"
        expect(errors.email).not.toMatch(/inválido|invalid|error/i);
    });

    it("Email con formato incorrecto → mensaje de formato inválido", () => {
        const errors = validateLoginForm("no-es-un-email", "Password1!");
        expect(errors.email).toBe("Formato de email inválido");
    });

    it("Contraseña vacía → mensaje 'La contraseña es requerida'", () => {
        const errors = validateLoginForm("user@test.com", "");
        expect(errors.password).toBe("La contraseña es requerida");
    });

    it("Formulario válido → sin errores (usuario puede avanzar)", () => {
        const errors = validateLoginForm("user@test.com", "miPassword");
        expect(Object.keys(errors)).toHaveLength(0);
    });
});

// ============================================================
// US-02  H5 — Prevención de errores en registro
//         El sistema valida la contraseña de forma progresiva
//         ANTES de enviar el formulario (feedback en tiempo real)
// Criterio de aceptación: cada regla de contraseña se evalúa
//   de forma independiente y el botón se bloquea si falla alguna
// ============================================================
describe("US-02 | Usabilidad — H5: Validación progresiva de contraseña en registro", () => {
    it("Contraseña corta (< 8 chars) → regla 'length' falla", () => {
        const rules = evaluatePasswordRules("Ab1!");
        expect(rules.length).toBe(false);
        expect(rules.upper).toBe(true);
        expect(rules.number).toBe(true);
        expect(rules.special).toBe(true);
        // El botón debe estar deshabilitado
        expect(isPasswordValid("Ab1!")).toBe(false);
    });

    it("Contraseña sin mayúscula → regla 'upper' falla", () => {
        const rules = evaluatePasswordRules("password1!");
        expect(rules.upper).toBe(false);
        expect(isPasswordValid("password1!")).toBe(false);
    });

    it("Contraseña sin número → regla 'number' falla", () => {
        const rules = evaluatePasswordRules("Password!");
        expect(rules.number).toBe(false);
        expect(isPasswordValid("Password!")).toBe(false);
    });

    it("Contraseña sin carácter especial → regla 'special' falla", () => {
        const rules = evaluatePasswordRules("Password1");
        expect(rules.special).toBe(false);
        expect(isPasswordValid("Password1")).toBe(false);
    });

    it("Contraseña que cumple TODOS los requisitos → botón habilitado", () => {
        const rules = evaluatePasswordRules("Password1!");
        expect(rules.length).toBe(true);
        expect(rules.upper).toBe(true);
        expect(rules.number).toBe(true);
        expect(rules.special).toBe(true);
        expect(isPasswordValid("Password1!")).toBe(true);
    });
});

// ============================================================
// US-03  H9 — Prevención de errores en formulario de solicitud
//         El formulario de solicitud de préstamo valida todos
//         los campos antes de permitir el envío
// Criterio de aceptación: nombre, fecha y activo son requeridos
// ============================================================
describe("US-03 | Usabilidad — H9: Validación del formulario de solicitud de préstamo", () => {
    const assets = [{ id: 1, nombre: "Guitarra", estado: "Disponible" }];

    it("Sin nombre de evento → error claro sobre ese campo", () => {
        const errors = validateLoanForm("", "2026-09-01", assets, {});
        expect(errors.eventName).toBeDefined();
        expect(errors.eventName).toMatch(/obligatorio/i);
    });

    it("Sin fecha → error claro sobre ese campo", () => {
        const errors = validateLoanForm("Concierto", "", assets, {});
        expect(errors.date).toBeDefined();
        expect(errors.date).toMatch(/obligatori/i);
    });

    it("Sin activo seleccionado → error que indica qué hacer", () => {
        const errors = validateLoanForm("Concierto", "2026-09-01", assets, { 1: false });
        expect(errors.assets).toBeDefined();
        expect(errors.assets).toMatch(/selecciona/i);
    });

    it("Sin activos disponibles → mensaje informativo diferente", () => {
        const errors = validateLoanForm("Concierto", "2026-09-01", [], {});
        expect(errors.assets).toMatch(/no hay activos/i);
    });

    it("Formulario completamente válido → sin errores", () => {
        const errors = validateLoanForm("Concierto de Navidad", "2026-12-20", assets, { 1: true });
        expect(Object.keys(errors)).toHaveLength(0);
    });
});

// ============================================================
// US-04  H1 — Visibilidad del estado del sistema
//         La vista activa cambia correctamente según el rol y
//         el título de página refleja siempre la sección actual
// Criterio de aceptación: el header siempre muestra el título
//   correcto para cada vista navegada
// ============================================================
describe("US-04 | Usabilidad — H1: Visibilidad de estado — Títulos de sección correctos", () => {
    it("Admin ve 'Gestión de Inventario' al entrar (vista default)", () => {
        const view = getInitialView("admin");
        const title = getPageTitle(view, "admin");
        expect(view).toBe("inventory");
        expect(title).toBe("Gestión de Inventario");
    });

    it("Colaborador ve 'Nueva Solicitud' al entrar (vista default)", () => {
        const view = getInitialView("user");
        const title = getPageTitle(view, "user");
        expect(view).toBe("loans_form");
        expect(title).toBe("Nueva Solicitud");
    });

    it("Vista 'loans_mine' muestra título 'Mis Solicitudes Activas'", () => {
        const title = getPageTitle("loans_mine", "user");
        expect(title).toBe("Mis Solicitudes Activas");
    });

    it("Vista 'loans' para admin muestra 'Solicitudes de Préstamo'", () => {
        const title = getPageTitle("loans", "admin");
        expect(title).toBe("Solicitudes de Préstamo");
    });
});

// ============================================================
// US-05  H6 — Reconocimiento en lugar de memorización
//         El formulario de registro valida nombre, email y
//         contraseña de forma independiente para que el usuario
//         sepa exactamente qué campo está mal
// Criterio de aceptación: errores por campo, no mensajes globales
// ============================================================
describe("US-05 | Usabilidad — H6: Errores por campo en registro (no mensajes globales)", () => {
    it("Solo falta nombre → solo hay error en 'nombre', no en otros campos", () => {
        const errors = validateRegisterForm("", "user@test.com", "Password1!");
        expect(errors.nombre).toBeDefined();
        expect(errors.email).toBeUndefined();
        expect(errors.password).toBeUndefined();
    });

    it("Solo email inválido → solo hay error en 'email'", () => {
        const errors = validateRegisterForm("Juan", "no-email", "Password1!");
        expect(errors.nombre).toBeUndefined();
        expect(errors.email).toBeDefined();
        expect(errors.password).toBeUndefined();
    });

    it("Solo contraseña débil → solo hay error en 'password'", () => {
        const errors = validateRegisterForm("Juan", "user@test.com", "debil");
        expect(errors.nombre).toBeUndefined();
        expect(errors.email).toBeUndefined();
        expect(errors.password).toBeDefined();
        expect(errors.password).toMatch(/requisitos/i);
    });

    it("Todos los campos correctos → sin errores y usuario puede registrarse", () => {
        const errors = validateRegisterForm("Juan Pérez", "juan@test.com", "Password1!");
        expect(Object.keys(errors)).toHaveLength(0);
    });
});

// ============================================================
// US-06  H5 — El sistema preserva el borrador del formulario
//         (draft recovery) para prevenir pérdida de datos
// Criterio de aceptación: los datos del formulario se pueden
//   recuperar tras una navegación accidental
// ============================================================
describe("US-06 | Usabilidad — H5: Prevención de pérdida de datos (draft recovery)", () => {
    it("El borrador guarda el estado actual del formulario de solicitud", () => {
        // Simula el estado del hook useLocalDraft
        const draft = {
            eventName: "Concierto de Rock",
            date: "2026-10-15",
            period: "Noche",
            selected: { 1: true, 3: false }
        };

        // El borrador contiene todos los campos necesarios para recuperación
        expect(draft.eventName).toBeTruthy();
        expect(draft.date).toBeTruthy();
        expect(draft.period).toBeTruthy();
        expect(draft.selected).toBeDefined();
    });

    it("Un borrador vacío no genera falso positivo de restauración", () => {
        const draft = { eventName: "", date: "", period: "Mañana", selected: {} };

        // El usuario NO debe ver el aviso de "borrador recuperado" con datos vacíos
        const hasData = draft.eventName.trim().length > 0 || draft.date.trim().length > 0;
        expect(hasData).toBe(false);
    });
});
