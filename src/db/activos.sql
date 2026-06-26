CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS activos (
    id SERIAL PRIMARY KEY,
    nombre_cifrado BYTEA NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    estado VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index optimization
CREATE INDEX IF NOT EXISTS idx_activos_categoria ON activos(categoria);
CREATE INDEX IF NOT EXISTS idx_activos_estado ON activos(estado);
