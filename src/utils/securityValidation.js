/**
 * Security Validation Utilities
 *
 * Covers:
 * - SQL Injection (SQLi) detection
 * - NoSQL Injection detection
 * - XSS / HTML injection detection
 * - Text field validation
 * - Integer ID validation (anti-BOLA type guessing)
 */

// ─── SQL Injection Patterns ──────────────────────────────────────────────────
const SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|CAST|CONVERT|DECLARE|FETCH|OPEN|KILL|xp_)\b)/i,
    /(-{2}|\/\*|\*\/)/,           // SQL comments: -- or /* */
    /(;|\bOR\b|\bAND\b)\s*\d+\s*=\s*\d+/i,  // OR 1=1 / AND 1=1
    /'\s*(OR|AND)\s*'[^']*'/i,    // ' OR 'a'='a
    /\b(SLEEP|BENCHMARK|WAITFOR|DELAY)\b/i,  // Time-based SQLi
    /0x[0-9a-fA-F]+/,             // Hex encoding
    /\bCHAR\s*\(/i,               // CHAR() function
    /\bINFORMATION_SCHEMA\b/i,    // Schema enumeration
    /\bSYSDATABASES\b|\bSYSOBJECTS\b/i // SQL Server system tables
];

// ─── NoSQL Injection Patterns ─────────────────────────────────────────────────
const NOSQL_INJECTION_PATTERNS = [
    /\$where\b/i,
    /\$gt\b|\$gte\b|\$lt\b|\$lte\b|\$ne\b|\$in\b|\$nin\b|\$or\b|\$and\b|\$not\b|\$nor\b/i,
    /\$regex\b|\$options\b/i,
    /\$expr\b|\$jsonSchema\b/i,
    /\{\s*"\$/, // raw JSON operator injection
];

// ─── XSS Patterns ─────────────────────────────────────────────────────────────
const XSS_PATTERNS = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript\s*:/i,
    /on\w+\s*=/i,          // onerror= onclick= etc.
    /<iframe[\s\S]*?>/i,
    /<svg[\s\S]*?>/i,
    /<img[^>]+src\s*=\s*["']?javascript:/i,
    /data:\s*text\/html/i,
];

/**
 * Checks a string value against all injection patterns.
 * Returns { safe: true } or { safe: false, type, message }
 */
function detectInjection(value) {
    if (typeof value !== "string") {
        return { safe: true };
    }

    for (const pattern of SQL_INJECTION_PATTERNS) {
        if (pattern.test(value)) {
            return {
                safe: false,
                type: "SQLi",
                message: "Se detectó un patrón de inyección SQL en los datos enviados."
            };
        }
    }

    for (const pattern of NOSQL_INJECTION_PATTERNS) {
        if (pattern.test(value)) {
            return {
                safe: false,
                type: "NoSQLi",
                message: "Se detectó un patrón de inyección NoSQL en los datos enviados."
            };
        }
    }

    for (const pattern of XSS_PATTERNS) {
        if (pattern.test(value)) {
            return {
                safe: false,
                type: "XSS",
                message: "El campo contiene contenido potencialmente peligroso (XSS)."
            };
        }
    }

    return { safe: true };
}

/**
 * Validates a text field for content and injection safety.
 *
 * @param {string} value     - The input value
 * @param {string} fieldName - The field name for error messages
 * @param {number} maxLength - Maximum allowed character length
 * @returns {{ isValid: boolean, value?: string, message?: string }}
 */
function validateTextField(value, fieldName, maxLength = 100) {
    if (typeof value !== "string") {
        return { isValid: false, message: `El campo ${fieldName} debe ser texto.` };
    }

    const trimmed = value.trim();

    if (!trimmed) {
        return { isValid: false, message: `El campo ${fieldName} es obligatorio.` };
    }

    if (trimmed.length > maxLength) {
        return {
            isValid: false,
            message: `El campo ${fieldName} no puede exceder ${maxLength} caracteres.`
        };
    }

    // Check injection patterns (SQLi, NoSQLi, XSS)
    const injection = detectInjection(trimmed);
    if (!injection.safe) {
        return { isValid: false, message: injection.message };
    }

    const hasMeaningfulContent = /[a-zA-ZÁÉÍÓÚáéíóúÑñ0-9]/.test(trimmed);
    if (!hasMeaningfulContent) {
        return {
            isValid: false,
            message: `El campo ${fieldName} debe contener texto coherente y útil.`
        };
    }

    return { isValid: true, value: trimmed };
}

/**
 * Validates an ID parameter to be a positive integer.
 * Prevents BOLA attacks via non-numeric or negative IDs.
 *
 * @param {string|number} value - The ID parameter from the URL
 * @returns {{ isValid: boolean, value?: number, message?: string }}
 */
function validateId(value) {
    const parsed = parseInt(value, 10);

    if (isNaN(parsed) || parsed <= 0 || String(parsed) !== String(value)) {
        return {
            isValid: false,
            message: "El identificador proporcionado no es válido. Debe ser un número entero positivo."
        };
    }

    return { isValid: true, value: parsed };
}

/**
 * Recursively checks all string values in an object for injection.
 * Used as a request body sanitizer middleware helper.
 *
 * @param {object} obj - The body object to scan
 * @returns {{ safe: boolean, message?: string }}
 */
function scanObjectForInjection(obj) {
    if (!obj || typeof obj !== "object") return { safe: true };

    for (const key of Object.keys(obj)) {
        const val = obj[key];

        if (typeof val === "string") {
            const result = detectInjection(val);
            if (!result.safe) return result;
        } else if (typeof val === "object" && val !== null) {
            const nested = scanObjectForInjection(val);
            if (!nested.safe) return nested;
        }
    }

    return { safe: true };
}

export { validateTextField, validateId, scanObjectForInjection };
