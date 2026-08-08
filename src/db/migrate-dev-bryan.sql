-- ============================================================
-- MIGRACIÓN: musical_group → dev_bryan
-- Servidor: PostgreSQL remoto (ver .env para conexión)
-- Descripción: Schema completo para API Musical Group
-- Tablas: usuarios, activos, solicitudes, historial_devoluciones
-- ============================================================

-- 1. Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Crear schema
CREATE SCHEMA IF NOT EXISTS musical_group;

-- Usar el schema por defecto en esta sesión
SET search_path TO musical_group, public;

-- ============================================================
-- 3. TABLAS
-- ============================================================

-- 3.1 usuarios
CREATE TABLE IF NOT EXISTS musical_group.usuarios (
    id         SERIAL PRIMARY KEY,
    nombre     VARCHAR(100) NOT NULL,
    email      VARCHAR(100) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.2 activos (nombre cifrado con pgcrypto)
CREATE TABLE IF NOT EXISTS musical_group.activos (
    id              SERIAL PRIMARY KEY,
    nombre_cifrado  BYTEA NOT NULL,
    categoria       VARCHAR(100) NOT NULL,
    estado          VARCHAR(50) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activos_categoria ON musical_group.activos(categoria);
CREATE INDEX IF NOT EXISTS idx_activos_estado    ON musical_group.activos(estado);

-- 3.3 solicitudes
CREATE TABLE IF NOT EXISTS musical_group.solicitudes (
    id                   SERIAL PRIMARY KEY,
    colaborador_email    VARCHAR(100) NOT NULL,
    activo_id            INTEGER NOT NULL REFERENCES musical_group.activos(id) ON DELETE CASCADE,
    estado               VARCHAR(50) DEFAULT 'Pendiente'
                             CHECK (estado IN ('Pendiente', 'Aprobada', 'Rechazada', 'Devuelta')),
    comentarios          TEXT,
    procesado_por        VARCHAR(100),
    fecha_procesamiento  TIMESTAMP,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_estado       ON musical_group.solicitudes(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_colaborador  ON musical_group.solicitudes(colaborador_email);

-- 3.4 historial_devoluciones
CREATE TABLE IF NOT EXISTS musical_group.historial_devoluciones (
    id                  SERIAL PRIMARY KEY,
    solicitud_id        INTEGER NOT NULL REFERENCES musical_group.solicitudes(id) ON DELETE CASCADE,
    activo_id           INTEGER NOT NULL REFERENCES musical_group.activos(id) ON DELETE CASCADE,
    devuelto_por        VARCHAR(100) NOT NULL,
    recibido_por        VARCHAR(100) NOT NULL,
    condiciones_fisicas TEXT NOT NULL,
    fecha_devolucion    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_historial_solicitud      ON musical_group.historial_devoluciones(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_historial_activo         ON musical_group.historial_devoluciones(activo_id);
CREATE INDEX IF NOT EXISTS idx_historial_fechadevolucion ON musical_group.historial_devoluciones(fecha_devolucion);

-- ============================================================
-- Verificación final
-- ============================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'musical_group'
ORDER BY table_name;
