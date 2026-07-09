CREATE SCHEMA IF NOT EXISTS musical_group;
SET search_path TO musical_group, extensions, public;

-- Create historial_devoluciones table
CREATE TABLE IF NOT EXISTS historial_devoluciones (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    activo_id INTEGER NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
    devuelto_por VARCHAR(100) NOT NULL, -- Email del colaborador
    recibido_por VARCHAR(100) NOT NULL, -- Email del administrador
    condiciones_fisicas TEXT NOT NULL,
    fecha_devolucion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optimize queries
CREATE INDEX IF NOT EXISTS idx_historial_solicitud ON historial_devoluciones(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_historial_activo ON historial_devoluciones(activo_id);
CREATE INDEX IF NOT EXISTS idx_historial_fechadevolucion ON historial_devoluciones(fecha_devolucion);
