-- ============================================================
-- MIGRACIÓN COMPLETA: schema public de Supabase → dev_bryan
-- Servidor: PostgreSQL remoto (ver .env para conexión)
-- Tablas: perfiles, categorias, activos, solicitudes,
--         solicitud_activos, devoluciones, avisos_privacidad,
--         aceptaciones_privacidad, solicitudes_arco, auditoria
-- ============================================================

SET search_path TO musical_group, public;

-- 0. Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. ENUMs
-- ============================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_usuario') THEN
        CREATE TYPE musical_group.rol_usuario AS ENUM ('administrador', 'colaborador');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_activo') THEN
        CREATE TYPE musical_group.estado_activo AS ENUM (
            'disponible', 'prestado', 'en_mantenimiento', 'danado', 'dado_de_baja'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_solicitud') THEN
        CREATE TYPE musical_group.estado_solicitud AS ENUM (
            'pendiente', 'aprobada', 'rechazada', 'en_uso', 'devuelta', 'cancelada'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_accion_auditoria') THEN
        CREATE TYPE musical_group.tipo_accion_auditoria AS ENUM (
            'CREAR', 'ACTUALIZAR', 'ELIMINAR', 'APROBAR', 'RECHAZAR', 'DEVOLVER'
        );
    END IF;
END $$;

-- ============================================================
-- 2. TABLAS (orden respeta FK dependencies)
-- ============================================================

-- 2.1 perfiles (base: referencia a auth.users por UUID, aquí independiente)
CREATE TABLE IF NOT EXISTS musical_group.perfiles (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_completo         VARCHAR(200) NOT NULL,
    correo                  VARCHAR(255) NOT NULL UNIQUE,
    telefono                VARCHAR(20),
    rol                     musical_group.rol_usuario DEFAULT 'colaborador',
    url_avatar              TEXT,
    departamento            VARCHAR(100),
    activo                  BOOLEAN DEFAULT TRUE,
    privacidad_aceptada     BOOLEAN DEFAULT FALSE,
    privacidad_aceptada_en  TIMESTAMPTZ,
    creado_en               TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en          TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 categorias
CREATE TABLE IF NOT EXISTS musical_group.categorias (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(100) NOT NULL,
    descripcion     TEXT,
    icono           VARCHAR(50),
    color           VARCHAR(7) DEFAULT '#6366f1',
    activa          BOOLEAN DEFAULT TRUE,
    creado_en       TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 activos
CREATE TABLE IF NOT EXISTS musical_group.activos_v2 (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(200) NOT NULL,
    categoria_id    UUID NOT NULL REFERENCES musical_group.categorias(id) ON DELETE RESTRICT,
    estado          musical_group.estado_activo DEFAULT 'disponible',
    descripcion     TEXT,
    numero_serie    VARCHAR(100),
    marca           VARCHAR(100),
    modelo          VARCHAR(100),
    fecha_compra    DATE,
    valor_compra    NUMERIC(12,2),
    valor_actual    NUMERIC(12,2),
    ubicacion       VARCHAR(200),
    notas_condicion TEXT,
    url_imagen      TEXT,
    activo          BOOLEAN DEFAULT TRUE,
    creado_en       TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ DEFAULT NOW(),
    creado_por      UUID REFERENCES musical_group.perfiles(id) ON DELETE SET NULL
);

-- 2.4 solicitudes
CREATE TABLE IF NOT EXISTS musical_group.solicitudes_v2 (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitante_id      UUID NOT NULL REFERENCES musical_group.perfiles(id) ON DELETE RESTRICT,
    nombre_evento       VARCHAR(300) NOT NULL,
    ubicacion_evento    VARCHAR(300),
    fecha_inicio        TIMESTAMPTZ NOT NULL,
    fecha_fin           TIMESTAMPTZ NOT NULL,
    estado              musical_group.estado_solicitud DEFAULT 'pendiente',
    notas               TEXT,
    notas_admin         TEXT,
    aprobado_por        UUID REFERENCES musical_group.perfiles(id) ON DELETE SET NULL,
    aprobado_en         TIMESTAMPTZ,
    rechazado_por       UUID REFERENCES musical_group.perfiles(id) ON DELETE SET NULL,
    rechazado_en        TIMESTAMPTZ,
    motivo_rechazo      TEXT,
    creado_en           TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 solicitud_activos (detalle de qué activos incluye cada solicitud)
CREATE TABLE IF NOT EXISTS musical_group.solicitud_activos_v2 (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitud_id            UUID NOT NULL REFERENCES musical_group.solicitudes_v2(id) ON DELETE CASCADE,
    activo_id               UUID NOT NULL REFERENCES musical_group.activos_v2(id) ON DELETE RESTRICT,
    cantidad                INTEGER NOT NULL DEFAULT 1,
    devuelto_en             TIMESTAMPTZ,
    condicion_devolucion    TEXT,
    notas_devolucion        TEXT,
    creado_en               TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_solicitud_activo UNIQUE (solicitud_id, activo_id)
);

-- 2.6 devoluciones
CREATE TABLE IF NOT EXISTS musical_group.devoluciones_v2 (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitud_id            UUID NOT NULL REFERENCES musical_group.solicitudes_v2(id) ON DELETE RESTRICT,
    activo_id               UUID NOT NULL REFERENCES musical_group.activos_v2(id) ON DELETE RESTRICT,
    devuelto_por            UUID NOT NULL REFERENCES musical_group.perfiles(id) ON DELETE RESTRICT,
    recibido_por            UUID REFERENCES musical_group.perfiles(id) ON DELETE SET NULL,
    devuelto_en             TIMESTAMPTZ DEFAULT NOW(),
    descripcion_condicion   TEXT NOT NULL,
    estado_fisico           VARCHAR(50),
    detalles_dano           TEXT,
    urls_fotos              TEXT[],
    creado_en               TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7 avisos_privacidad
CREATE TABLE IF NOT EXISTS musical_group.avisos_privacidad (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version                 VARCHAR(20) NOT NULL,
    titulo                  VARCHAR(200) NOT NULL,
    contenido_integral      TEXT NOT NULL,
    contenido_simplificado  TEXT NOT NULL,
    activo                  BOOLEAN DEFAULT TRUE,
    fecha_vigencia          DATE NOT NULL,
    creado_en               TIMESTAMPTZ DEFAULT NOW()
);

-- 2.8 aceptaciones_privacidad
CREATE TABLE IF NOT EXISTS musical_group.aceptaciones_privacidad (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id  UUID NOT NULL REFERENCES musical_group.perfiles(id) ON DELETE CASCADE,
    aviso_id    UUID NOT NULL REFERENCES musical_group.avisos_privacidad(id) ON DELETE RESTRICT,
    aceptado_en TIMESTAMPTZ DEFAULT NOW(),
    ip          INET,
    user_agent  TEXT,
    CONSTRAINT uq_usuario_aviso UNIQUE (usuario_id, aviso_id)
);

-- 2.9 solicitudes_arco
CREATE TABLE IF NOT EXISTS musical_group.solicitudes_arco (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id      UUID NOT NULL REFERENCES musical_group.perfiles(id) ON DELETE CASCADE,
    tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('acceso','rectificacion','cancelacion','oposicion')),
    estado          VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_proceso','completada','rechazada')),
    descripcion     TEXT,
    respuesta_admin TEXT,
    completada_en   TIMESTAMPTZ,
    creado_en       TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ DEFAULT NOW()
);

-- 2.10 auditoria
CREATE TABLE IF NOT EXISTS musical_group.auditoria (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tabla            VARCHAR(100) NOT NULL,
    registro_id      UUID NOT NULL,
    accion           musical_group.tipo_accion_auditoria NOT NULL,
    realizado_por    UUID REFERENCES musical_group.perfiles(id) ON DELETE SET NULL,
    realizado_en     TIMESTAMPTZ DEFAULT NOW(),
    datos_anteriores JSONB,
    datos_nuevos     JSONB,
    ip               INET,
    user_agent       TEXT,
    finalidad        VARCHAR(200)
);

-- ============================================================
-- 3. ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_perfiles_correo      ON musical_group.perfiles(correo);
CREATE INDEX IF NOT EXISTS idx_perfiles_rol         ON musical_group.perfiles(rol);
CREATE INDEX IF NOT EXISTS idx_categorias_activa    ON musical_group.categorias(activa);
CREATE INDEX IF NOT EXISTS idx_activos_v2_categoria ON musical_group.activos_v2(categoria_id);
CREATE INDEX IF NOT EXISTS idx_activos_v2_estado    ON musical_group.activos_v2(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_v2_solicitante ON musical_group.solicitudes_v2(solicitante_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_v2_estado      ON musical_group.solicitudes_v2(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_v2_fechas      ON musical_group.solicitudes_v2(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_sol_activos_solicitud ON musical_group.solicitud_activos_v2(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_sol_activos_activo    ON musical_group.solicitud_activos_v2(activo_id);
CREATE INDEX IF NOT EXISTS idx_devoluciones_solicitud ON musical_group.devoluciones_v2(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_devoluciones_activo    ON musical_group.devoluciones_v2(activo_id);
CREATE INDEX IF NOT EXISTS idx_acept_usuario  ON musical_group.aceptaciones_privacidad(usuario_id);
CREATE INDEX IF NOT EXISTS idx_arco_usuario   ON musical_group.solicitudes_arco(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla ON musical_group.auditoria(tabla);
CREATE INDEX IF NOT EXISTS idx_auditoria_quien ON musical_group.auditoria(realizado_por);

-- Verificación
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'musical_group'
ORDER BY table_name;
