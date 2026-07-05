CREATE SCHEMA IF NOT EXISTS musical_group;
SET search_path TO musical_group, extensions, public;

-- Create solicitudes table for asset requests
CREATE TABLE IF NOT EXISTS solicitudes (
    id SERIAL PRIMARY KEY,
    colaborador_email VARCHAR(100) NOT NULL,
    activo_id INTEGER NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
    estado VARCHAR(50) DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Aprobada', 'Rechazada')),
    comentarios TEXT,
    procesado_por VARCHAR(100),
    fecha_procesamiento TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optimize queries
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_colaborador ON solicitudes(colaborador_email);
