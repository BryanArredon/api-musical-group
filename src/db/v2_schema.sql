-- ============================================================
-- ESQUEMA V2: musical_group
-- Arquitectura Empresarial (10 Tablas) con UUIDs y Auditoría
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tipos ENUM
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_usuario') THEN
        CREATE TYPE rol_usuario AS ENUM ('user', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_fisico') THEN
        CREATE TYPE estado_fisico AS ENUM ('excelente', 'bueno', 'dañado', 'perdido');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_derecho_arco') THEN
        CREATE TYPE tipo_derecho_arco AS ENUM ('acceso', 'rectificacion', 'cancelacion', 'oposicion');
    END IF;
END $$;

-- 2. TABLAS NÚCLEO (AUTH Y ORGANIZACIÓN)

CREATE TABLE IF NOT EXISTS perfiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol rol_usuario DEFAULT 'user',
    departamento VARCHAR(100),
    avatar TEXT,
    privacidad JSONB DEFAULT '{"mostrar_email": false}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLAS DE INVENTARIO (ACTIVOS_V2)

CREATE TABLE IF NOT EXISTS activos_v2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_cifrado BYTEA NOT NULL,
    categoria_id UUID NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    estado VARCHAR(50) DEFAULT 'disponible',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLAS DE PRÉSTAMOS (SOLICITUDES_V2 Y PIVOTE)

CREATE TABLE IF NOT EXISTS solicitudes_v2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ NOT NULL,
    nombre_evento VARCHAR(200) NOT NULL,
    ubicacion TEXT,
    estado VARCHAR(50) DEFAULT 'pendiente',
    comentarios TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_fechas CHECK (fecha_fin >= fecha_inicio)
);

CREATE TABLE IF NOT EXISTS solicitud_activos_v2 (
    solicitud_id UUID NOT NULL REFERENCES solicitudes_v2(id) ON DELETE CASCADE,
    activo_id UUID NOT NULL REFERENCES activos_v2(id) ON DELETE RESTRICT,
    asignado_en TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (solicitud_id, activo_id)
);

CREATE TABLE IF NOT EXISTS devoluciones_v2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitud_id UUID UNIQUE NOT NULL REFERENCES solicitudes_v2(id) ON DELETE CASCADE,
    estado_fisico estado_fisico NOT NULL,
    urls_fotos TEXT[],
    detalles_dano TEXT,
    evaluado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLAS DE LEGALIDAD (LGPDPPSO - AVISOS Y ARCO)

CREATE TABLE IF NOT EXISTS avisos_privacidad (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(20) UNIQUE NOT NULL,
    contenido TEXT NOT NULL,
    vigente_desde TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aceptaciones_privacidad (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    aviso_id UUID NOT NULL REFERENCES avisos_privacidad(id) ON DELETE RESTRICT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS solicitudes_arco (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    tipo_derecho tipo_derecho_arco NOT NULL,
    detalles TEXT NOT NULL,
    estado VARCHAR(50) DEFAULT 'pendiente',
    respuesta TEXT,
    resuelto_por UUID REFERENCES perfiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA DE TRAZABILIDAD (AUDITORÍA)

CREATE TABLE IF NOT EXISTS auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tabla_afectada VARCHAR(100) NOT NULL,
    registro_id UUID NOT NULL,
    accion VARCHAR(50) NOT NULL,
    datos_previos JSONB,
    datos_nuevos JSONB,
    realizado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_perfiles_email ON perfiles(email);
CREATE INDEX IF NOT EXISTS idx_activos_categoria ON activos_v2(categoria_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_usuario ON solicitudes_v2(usuario_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_fechas ON solicitudes_v2(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla ON auditoria(tabla_afectada, registro_id);
