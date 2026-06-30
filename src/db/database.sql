-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
CREATE TYPE estado_activo AS ENUM ('disponible', 'prestado', 'en_mantenimiento', 'danado', 'dado_de_baja');
CREATE TYPE estado_solicitud AS ENUM ('pendiente', 'aprobada', 'rechazada', 'en_uso', 'devuelta', 'cancelada');
CREATE TYPE rol_usuario AS ENUM ('administrador', 'colaborador');
CREATE TYPE tipo_accion_auditoria AS ENUM ('CREAR', 'ACTUALIZAR', 'ELIMINAR', 'APROBAR', 'RECHAZAR', 'DEVOLVER');

-- 3. TABLAS

-- Categorías de equipos
CREATE TABLE categorias (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    descripcion     TEXT,
    icono           VARCHAR(50),
    color           VARCHAR(7) DEFAULT '#6366f1',
    activa          BOOLEAN DEFAULT TRUE,
    creado_en       TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ DEFAULT NOW()
);

-- Activos del inventario
CREATE TABLE activos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(200) NOT NULL,
    categoria_id    UUID NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    estado          estado_activo DEFAULT 'disponible',
    descripcion     TEXT,
    numero_serie    VARCHAR(100) UNIQUE,
    marca           VARCHAR(100),
    modelo          VARCHAR(100),
    fecha_compra    DATE,
    valor_compra    DECIMAL(12,2),
    valor_actual    DECIMAL(12,2),
    ubicacion       VARCHAR(200),
    notas_condicion TEXT,
    url_imagen      TEXT,
    activo          BOOLEAN DEFAULT TRUE,
    creado_en       TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ DEFAULT NOW(),
    creado_por      UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Perfiles de usuario (extiende auth.users)
CREATE TABLE perfiles (
    id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre_completo     VARCHAR(200) NOT NULL,
    correo              VARCHAR(255) NOT NULL UNIQUE,
    telefono            VARCHAR(20),
    rol                 rol_usuario DEFAULT 'colaborador',
    url_avatar          TEXT,
    departamento        VARCHAR(100),
    activo              BOOLEAN DEFAULT TRUE,
    privacidad_aceptada BOOLEAN DEFAULT FALSE,
    privacidad_aceptada_en TIMESTAMPTZ,
    creado_en           TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ DEFAULT NOW()
);

-- Solicitudes de préstamo
CREATE TABLE solicitudes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitante_id      UUID NOT NULL REFERENCES perfiles(id) ON DELETE RESTRICT,
    nombre_evento       VARCHAR(300) NOT NULL,
    ubicacion_evento    VARCHAR(300),
    fecha_inicio        TIMESTAMPTZ NOT NULL,
    fecha_fin           TIMESTAMPTZ NOT NULL,
    estado              estado_solicitud DEFAULT 'pendiente',
    notas               TEXT,
    notas_admin         TEXT,
    aprobado_por        UUID REFERENCES perfiles(id) ON DELETE SET NULL,
    aprobado_en         TIMESTAMPTZ,
    rechazado_por       UUID REFERENCES perfiles(id) ON DELETE SET NULL,
    rechazado_en        TIMESTAMPTZ,
    motivo_rechazo      TEXT,
    creado_en           TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_fechas CHECK (fecha_fin > fecha_inicio)
);

-- Relación solicitudes-activos (N:M)
CREATE TABLE solicitud_activos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitud_id    UUID NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    activo_id       UUID NOT NULL REFERENCES activos(id) ON DELETE RESTRICT,
    cantidad        INTEGER NOT NULL DEFAULT 1,
    devuelto_en     TIMESTAMPTZ,
    condicion_devolucion TEXT,
    notas_devolucion     TEXT,
    creado_en       TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_solicitud_activo UNIQUE (solicitud_id, activo_id),
    CONSTRAINT chk_cantidad_positiva CHECK (cantidad > 0)
);

-- Registro de devoluciones
CREATE TABLE devoluciones (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitud_id        UUID NOT NULL REFERENCES solicitudes(id) ON DELETE RESTRICT,
    activo_id           UUID NOT NULL REFERENCES activos(id) ON DELETE RESTRICT,
    devuelto_por        UUID NOT NULL REFERENCES perfiles(id) ON DELETE RESTRICT,
    recibido_por        UUID REFERENCES perfiles(id) ON DELETE SET NULL,
    devuelto_en         TIMESTAMPTZ DEFAULT NOW(),
    descripcion_condicion TEXT NOT NULL,
    estado_fisico       VARCHAR(50),
    detalles_dano       TEXT,
    urls_fotos          TEXT[],
    creado_en           TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_devolucion UNIQUE (solicitud_id, activo_id)
);

-- Auditoría
CREATE TABLE auditoria (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tabla           VARCHAR(100) NOT NULL,
    registro_id     UUID NOT NULL,
    accion          tipo_accion_auditoria NOT NULL,
    realizado_por   UUID REFERENCES perfiles(id) ON DELETE SET NULL,
    realizado_en    TIMESTAMPTZ DEFAULT NOW(),
    datos_anteriores JSONB,
    datos_nuevos    JSONB,
    ip              INET,
    user_agent      TEXT,
    finalidad       VARCHAR(200)
);

-- Solicitudes ARCO
CREATE TABLE solicitudes_arco (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id      UUID NOT NULL REFERENCES perfiles(id) ON DELETE RESTRICT,
    tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('acceso', 'rectificacion', 'cancelacion', 'oposicion')),
    estado          VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'completada', 'rechazada')),
    descripcion     TEXT,
    respuesta_admin TEXT,
    completada_en   TIMESTAMPTZ,
    creado_en       TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ DEFAULT NOW()
);

-- Avisos de privacidad
CREATE TABLE avisos_privacidad (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version             VARCHAR(20) NOT NULL,
    titulo              VARCHAR(200) NOT NULL,
    contenido_integral  TEXT NOT NULL,
    contenido_simplificado TEXT NOT NULL,
    activo              BOOLEAN DEFAULT TRUE,
    fecha_vigencia      DATE NOT NULL,
    creado_en           TIMESTAMPTZ DEFAULT NOW()
);

-- Aceptaciones de privacidad
CREATE TABLE aceptaciones_privacidad (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id      UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    aviso_id        UUID NOT NULL REFERENCES avisos_privacidad(id) ON DELETE RESTRICT,
    aceptado_en     TIMESTAMPTZ DEFAULT NOW(),
    ip              INET,
    user_agent      TEXT
);

-- 4. ÍNDICES
CREATE INDEX idx_activos_categoria ON activos(categoria_id);
CREATE INDEX idx_activos_estado ON activos(estado);
CREATE INDEX idx_activos_activo ON activos(activo) WHERE activo = TRUE;
CREATE INDEX idx_perfiles_rol ON perfiles(rol);
CREATE INDEX idx_solicitudes_solicitante ON solicitudes(solicitante_id);
CREATE INDEX idx_solicitudes_estado ON solicitudes(estado);
CREATE INDEX idx_solicitudes_fechas ON solicitudes(fecha_inicio, fecha_fin);
CREATE INDEX idx_sol_act_solicitud ON solicitud_activos(solicitud_id);
CREATE INDEX idx_sol_act_activo ON solicitud_activos(activo_id);
CREATE INDEX idx_devoluciones_solicitud ON devoluciones(solicitud_id);
CREATE INDEX idx_devoluciones_activo ON devoluciones(activo_id);
CREATE INDEX idx_auditoria_tabla ON auditoria(tabla);
CREATE INDEX idx_auditoria_registro ON auditoria(registro_id);
CREATE INDEX idx_auditoria_fecha ON auditoria(realizado_en);
CREATE INDEX idx_arco_usuario ON solicitudes_arco(usuario_id);
CREATE INDEX idx_arco_estado ON solicitudes_arco(estado);

-- 5. DATOS INICIALES
INSERT INTO categorias (nombre, descripcion, icono, color) VALUES
('Guitarras', 'Guitarras eléctricas y acústicas', 'guitar', '#ef4444'),
('Baterías', 'Baterías acústicas y electrónicas', 'drum', '#f97316'),
('Teclados', 'Teclados, pianos digitales y sintetizadores', 'keyboard', '#3b82f6'),
('Micrófonos', 'Micrófonos dinámicos, de condensador y de cinta', 'mic', '#8b5cf6'),
('Amplificadores', 'Amplificadores de guitarra, bajo y PA', 'speaker', '#10b981'),
('Mezcladoras', 'Consolas de mezcla analógicas y digitales', 'sliders', '#06b6d4'),
('Monitores', 'Monitores de escenario y de estudio', 'headphones', '#f59e0b'),
('Cables y Conectores', 'Cables XLR, TRS, speakON y accesorios', 'plug', '#64748b'),
('Iluminación', 'Luces LED, moving heads y controladores DMX', 'lightbulb', '#ec4899'),
('Otros', 'Equipos misceláneos y accesorios', 'box', '#94a3b8');

INSERT INTO avisos_privacidad (version, titulo, contenido_integral, contenido_simplificado, fecha_vigencia) VALUES
('1.0', 
 'Aviso de Privacidad - Sistema de Inventario Musical',
 'AVISO DE PRIVACIDAD INTEGRAL...',
 'Resumen: Este sistema recopila datos personales mínimos necesarios para la gestión de préstamo de equipos musicales.',
 CURRENT_DATE
);

