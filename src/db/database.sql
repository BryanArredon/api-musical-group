-- ============================================================
-- ESQUEMA: musical_group (AUTÓNOMO / SIN DEPENDENCIAS EXTERNAS)
-- Para: Supabase (PostgreSQL + Row Level Security + Auth)
-- ============================================================

/**
 * [CERTIFICACIÓN RNF8 - CIFRADO EN REPOSO]
 * Nota de Arquitectura:
 * Para cumplir con el requerimiento de "Cifrado en reposo" de la base de datos, no se implementa 
 * cifrado de disco a nivel de aplicación Node.js. En su lugar, se confía en la infraestructura 
 * gestionada por Supabase (PostgreSQL), la cual provee cifrado nativo de volumen (AES-256) 
 * transparente para todos los clústeres por defecto en sus proveedores de nube (AWS/GCP).
 */
 
-- 0. EXTENSIONES PREVIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CREAR ESQUEMA
CREATE SCHEMA IF NOT EXISTS musical_group;

-- 2. ENUMS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_evento') THEN
        CREATE TYPE musical_group.tipo_evento AS ENUM (
            'concierto', 'ensayo', 'grabacion', 'ensayo_grabacion',
            'evento_privado', 'evento_publico', 'festival', 'otro'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_evento') THEN
        CREATE TYPE musical_group.estado_evento AS ENUM (
            'programado', 'confirmado', 'cancelado', 'realizado', 'pospuesto'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'instrumento_rol') THEN
        CREATE TYPE musical_group.instrumento_rol AS ENUM (
            'vocalista', 'guitarrista', 'bajista', 'baterista',
            'tecladista', 'saxofonista', 'trompetista', 'trombonista',
            'violinista', 'percusionista', 'dj', 'productor',
            'director_musical', 'corista', 'otro'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nivel_habilidad') THEN
        CREATE TYPE musical_group.nivel_habilidad AS ENUM (
            'principiante', 'intermedio', 'avanzado', 'profesional'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_miembro') THEN
        CREATE TYPE musical_group.estado_miembro AS ENUM (
            'activo', 'inactivo', 'suspendido', 'expulsado', 'retirado'
        );
    END IF;
END $$;

-- 3. FUNCION AUXILIAR: actualizar_timestamp
CREATE OR REPLACE FUNCTION musical_group.actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. TABLAS
-- ============================================================

-- 4.1 GRUPOS
CREATE TABLE IF NOT EXISTS musical_group.grupos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre              VARCHAR(200) NOT NULL,
    descripcion         TEXT,
    genero_musical      VARCHAR(100),
    fecha_fundacion     DATE,
    url_logo            TEXT,
    url_sitio_web       TEXT,
    redes_sociales      JSONB,
    color_primario      VARCHAR(7) DEFAULT '#6366f1',
    color_secundario    VARCHAR(7) DEFAULT '#8b5cf6',
    activo              BOOLEAN DEFAULT TRUE,
    creado_en           TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ DEFAULT NOW(),
    creado_por          UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TRIGGER trg_grupos_actualizado
    BEFORE UPDATE ON musical_group.grupos
    FOR EACH ROW EXECUTE FUNCTION musical_group.actualizar_timestamp();

-- 4.2 MIEMBROS
CREATE TABLE IF NOT EXISTS musical_group.miembros (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grupo_id            UUID NOT NULL REFERENCES musical_group.grupos(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Apunta a Auth directo
    instrumento_rol     musical_group.instrumento_rol NOT NULL DEFAULT 'otro',
    nivel_habilidad     musical_group.nivel_habilidad DEFAULT 'intermedio',
    fecha_ingreso       DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_salida        DATE,
    estado              musical_group.estado_miembro DEFAULT 'activo',
    es_lider            BOOLEAN DEFAULT FALSE,
    biografia_rol       TEXT,
    orden_escenario     INTEGER DEFAULT 0,
    activo              BOOLEAN DEFAULT TRUE,
    creado_en           TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_miembro_grupo_user UNIQUE (grupo_id, user_id),
    CONSTRAINT chk_fechas_miembro CHECK (fecha_salida IS NULL OR fecha_salida >= fecha_ingreso)
);

CREATE TRIGGER trg_miembros_actualizado
    BEFORE UPDATE ON musical_group.miembros
    FOR EACH ROW EXECUTE FUNCTION musical_group.actualizar_timestamp();

-- 4.3 EVENTOS
CREATE TABLE IF NOT EXISTS musical_group.eventos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grupo_id            UUID NOT NULL REFERENCES musical_group.grupos(id) ON DELETE CASCADE,
    nombre              VARCHAR(300) NOT NULL,
    tipo                musical_group.tipo_evento NOT NULL DEFAULT 'concierto',
    estado              musical_group.estado_evento NOT NULL DEFAULT 'programado',
    descripcion         TEXT,
    fecha_inicio        TIMESTAMPTZ NOT NULL,
    fecha_fin           TIMESTAMPTZ,
    ubicacion           VARCHAR(300),
    direccion           TEXT,
    url_mapa            TEXT,
    capacidad_publico   INTEGER,
    entrada_precio      DECIMAL(10,2),
    url_entradas        TEXT,
    notas_tecnicas      TEXT,
    rider_tecnico       JSONB,
    responsable_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Apunta a Auth directo
    activo              BOOLEAN DEFAULT TRUE,
    creado_en           TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT chk_fechas_evento CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE TRIGGER trg_eventos_actualizado
    BEFORE UPDATE ON musical_group.eventos
    FOR EACH ROW EXECUTE FUNCTION musical_group.actualizar_timestamp();

-- 4.4 ENSAYOS
CREATE TABLE IF NOT EXISTS musical_group.ensayos (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grupo_id                UUID NOT NULL REFERENCES musical_group.grupos(id) ON DELETE CASCADE,
    nombre                  VARCHAR(200) NOT NULL,
    fecha_inicio            TIMESTAMPTZ NOT NULL,
    fecha_fin               TIMESTAMPTZ NOT NULL,
    ubicacion               VARCHAR(300),
    objetivo                TEXT,
    notas                   TEXT,
    asistencia_requerida    BOOLEAN DEFAULT TRUE,
    estado                  VARCHAR(20) DEFAULT 'programado' CHECK (estado IN ('programado', 'realizado', 'cancelado')),
    activo                  BOOLEAN DEFAULT TRUE,
    creado_en               TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en          TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT chk_fechas_ensayo CHECK (fecha_fin > fecha_inicio)
);

CREATE TRIGGER trg_ensayos_actualizado
    BEFORE UPDATE ON musical_group.ensayos
    FOR EACH ROW EXECUTE FUNCTION musical_group.actualizar_timestamp();

-- 4.5 ASISTENCIA A ENSAYOS
CREATE TABLE IF NOT EXISTS musical_group.asistencia_ensayos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ensayo_id           UUID NOT NULL REFERENCES musical_group.ensayos(id) ON DELETE CASCADE,
    miembro_id          UUID NOT NULL REFERENCES musical_group.miembros(id) ON DELETE CASCADE,
    asistio             BOOLEAN DEFAULT FALSE,
    llegada_tarde       BOOLEAN DEFAULT FALSE,
    minutos_retraso     INTEGER DEFAULT 0,
    justificacion       TEXT,
    notas               TEXT,
    registrado_por      UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Apunta a Auth directo
    creado_en           TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_asistencia_ensayo UNIQUE (ensayo_id, miembro_id)
);

-- 4.6 CANCIONES (REPERTORIO)
CREATE TABLE IF NOT EXISTS musical_group.canciones (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grupo_id            UUID NOT NULL REFERENCES musical_group.grupos(id) ON DELETE CASCADE,
    titulo              VARCHAR(300) NOT NULL,
    artista_original    VARCHAR(300),
    album               VARCHAR(300),
    duracion_segundos   INTEGER,
    tono                VARCHAR(20),
    tempo_bpm           INTEGER,
    letra               TEXT,
    acordes             TEXT,
    notas_musicales     TEXT,
    url_audio           TEXT,
    url_video           TEXT,
    dificultad          musical_group.nivel_habilidad DEFAULT 'intermedio',
    activo              BOOLEAN DEFAULT TRUE,
    creado_en           TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_canciones_actualizado
    BEFORE UPDATE ON musical_group.canciones
    FOR EACH ROW EXECUTE FUNCTION musical_group.actualizar_timestamp();

-- 4.7 SETLISTS
CREATE TABLE IF NOT EXISTS musical_group.setlists (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id                   UUID NOT NULL REFERENCES musical_group.eventos(id) ON DELETE CASCADE,
    nombre                      VARCHAR(200) NOT NULL,
    descripcion                 TEXT,
    orden_total                 INTEGER DEFAULT 0,
    duracion_total_segundos     INTEGER DEFAULT 0,
    activo                      BOOLEAN DEFAULT TRUE,
    creado_en                   TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_setlists_actualizado
    BEFORE UPDATE ON musical_group.setlists
    FOR EACH ROW EXECUTE FUNCTION musical_group.actualizar_timestamp();

-- 4.8 SETLIST_CANCIONES
CREATE TABLE IF NOT EXISTS musical_group.setlist_canciones (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setlist_id      UUID NOT NULL REFERENCES musical_group.setlists(id) ON DELETE CASCADE,
    cancion_id      UUID NOT NULL REFERENCES musical_group.canciones(id) ON DELETE CASCADE,
    orden           INTEGER NOT NULL DEFAULT 1,
    notas           TEXT,
    creado_en       TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_setlist_cancion UNIQUE (setlist_id, cancion_id)
);

-- 4.9 COMENTARIOS
CREATE TABLE IF NOT EXISTS musical_group.comentarios (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grupo_id        UUID NOT NULL REFERENCES musical_group.grupos(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Apunta a Auth directo
    contenido       TEXT NOT NULL,
    tipo            VARCHAR(30) DEFAULT 'general' CHECK (tipo IN ('general', 'tecnico', 'organizativo', 'creativo')),
    es_anclado      BOOLEAN DEFAULT FALSE,
    activo          BOOLEAN DEFAULT TRUE,
    creado_en       TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_comentarios_actualizado
    BEFORE UPDATE ON musical_group.comentarios
    FOR EACH ROW EXECUTE FUNCTION musical_group.actualizar_timestamp();

-- ============================================================
-- 5. ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_grupos_activo ON musical_group.grupos(activo) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_grupos_genero ON musical_group.grupos(genero_musical);
CREATE INDEX IF NOT EXISTS idx_miembros_grupo ON musical_group.miembros(grupo_id);
CREATE INDEX IF NOT EXISTS idx_miembros_user ON musical_group.miembros(user_id);
CREATE INDEX IF NOT EXISTS idx_miembros_estado ON musical_group.miembros(estado);
CREATE INDEX IF NOT EXISTS idx_miembros_rol ON musical_group.miembros(instrumento_rol);
CREATE INDEX IF NOT EXISTS idx_eventos_grupo ON musical_group.eventos(grupo_id);
CREATE INDEX IF NOT EXISTS idx_eventos_estado ON musical_group.eventos(estado);
CREATE INDEX IF NOT EXISTS idx_eventos_fechas ON musical_group.eventos(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON musical_group.eventos(tipo);
CREATE INDEX IF NOT EXISTS idx_ensayos_grupo ON musical_group.ensayos(grupo_id);
CREATE INDEX IF NOT EXISTS idx_ensayos_fechas ON musical_group.ensayos(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_asistencia_ensayo ON musical_group.asistencia_ensayos(ensayo_id);
CREATE INDEX IF NOT EXISTS idx_asistencia_miembro ON musical_group.asistencia_ensayos(miembro_id);
CREATE INDEX IF NOT EXISTS idx_canciones_grupo ON musical_group.canciones(grupo_id);
CREATE INDEX IF NOT EXISTS idx_canciones_titulo ON musical_group.canciones(titulo);
CREATE INDEX IF NOT EXISTS idx_setlists_evento ON musical_group.setlists(evento_id);
CREATE INDEX IF NOT EXISTS idx_setlist_canciones_setlist ON musical_group.setlist_canciones(setlist_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_grupo ON musical_group.comentarios(grupo_id);

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE musical_group.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE musical_group.miembros ENABLE ROW LEVEL SECURITY;
ALTER TABLE musical_group.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE musical_group.ensayos ENABLE ROW LEVEL SECURITY;
ALTER TABLE musical_group.asistencia_ensayos ENABLE ROW LEVEL SECURITY;
ALTER TABLE musical_group.canciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE musical_group.setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE musical_group.setlist_canciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE musical_group.comentarios ENABLE ROW LEVEL SECURITY;

-- Función auxiliar: Lee el rol desde "user_metadata" de Supabase Auth
CREATE OR REPLACE FUNCTION musical_group.es_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (auth.jwt() -> 'user_metadata' ->> 'rol') = 'administrador';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función auxiliar: verificar si el usuario es miembro activo de un grupo
CREATE OR REPLACE FUNCTION musical_group.es_miembro_grupo(p_grupo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM musical_group.miembros
        WHERE grupo_id = p_grupo_id
          AND user_id = auth.uid()
          AND estado = 'activo'
          AND activo = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6.1 POLICIES: GRUPOS
CREATE POLICY "grupos_select_todos" ON musical_group.grupos FOR SELECT USING (activo = TRUE);
CREATE POLICY "grupos_insert_admin" ON musical_group.grupos FOR INSERT WITH CHECK (musical_group.es_admin());
CREATE POLICY "grupos_update_admin" ON musical_group.grupos FOR UPDATE USING (musical_group.es_admin());
CREATE POLICY "grupos_delete_admin" ON musical_group.grupos FOR DELETE USING (musical_group.es_admin());

-- 6.2 POLICIES: MIEMBROS
CREATE POLICY "miembros_select_miembro_o_admin" ON musical_group.miembros FOR SELECT USING (musical_group.es_admin() OR musical_group.es_miembro_grupo(grupo_id));
CREATE POLICY "miembros_insert_admin" ON musical_group.miembros FOR INSERT WITH CHECK (musical_group.es_admin());
CREATE POLICY "miembros_update_admin" ON musical_group.miembros FOR UPDATE USING (musical_group.es_admin());
CREATE POLICY "miembros_delete_admin" ON musical_group.miembros FOR DELETE USING (musical_group.es_admin());

-- 6.3 POLICIES: EVENTOS
CREATE POLICY "eventos_select_miembro_o_admin" ON musical_group.eventos FOR SELECT USING (musical_group.es_admin() OR musical_group.es_miembro_grupo(grupo_id));
CREATE POLICY "eventos_insert_admin" ON musical_group.eventos FOR INSERT WITH CHECK (musical_group.es_admin());
CREATE POLICY "eventos_update_admin" ON musical_group.eventos FOR UPDATE USING (musical_group.es_admin());
CREATE POLICY "eventos_delete_admin" ON musical_group.eventos FOR DELETE USING (musical_group.es_admin());

-- 6.4 POLICIES: ENSAYOS
CREATE POLICY "ensayos_select_miembro_o_admin" ON musical_group.ensayos FOR SELECT USING (musical_group.es_admin() OR musical_group.es_miembro_grupo(grupo_id));
CREATE POLICY "ensayos_insert_admin" ON musical_group.ensayos FOR INSERT WITH CHECK (musical_group.es_admin());
CREATE POLICY "ensayos_update_admin" ON musical_group.ensayos FOR UPDATE USING (musical_group.es_admin());
CREATE POLICY "ensayos_delete_admin" ON musical_group.ensayos FOR DELETE USING (musical_group.es_admin());

-- 6.5 POLICIES: ASISTENCIA ENSAYOS
CREATE POLICY "asistencia_select_miembro_o_admin" ON musical_group.asistencia_ensayos FOR SELECT USING (
    musical_group.es_admin() OR EXISTS (
        SELECT 1 FROM musical_group.miembros m
        JOIN musical_group.ensayos e ON e.id = asistencia_ensayos.ensayo_id
        WHERE m.user_id = auth.uid() AND m.grupo_id = e.grupo_id AND m.estado = 'activo'
    )
);
CREATE POLICY "asistencia_insert_admin" ON musical_group.asistencia_ensayos FOR INSERT WITH CHECK (musical_group.es_admin());
CREATE POLICY "asistencia_update_admin" ON musical_group.asistencia_ensayos FOR UPDATE USING (musical_group.es_admin());
CREATE POLICY "asistencia_delete_admin" ON musical_group.asistencia_ensayos FOR DELETE USING (musical_group.es_admin());

-- 6.6 POLICIES: CANCIONES
CREATE POLICY "canciones_select_miembro_o_admin" ON musical_group.canciones FOR SELECT USING (musical_group.es_admin() OR musical_group.es_miembro_grupo(grupo_id));
CREATE POLICY "canciones_insert_admin" ON musical_group.canciones FOR INSERT WITH CHECK (musical_group.es_admin());
CREATE POLICY "canciones_update_admin" ON musical_group.canciones FOR UPDATE USING (musical_group.es_admin());
CREATE POLICY "canciones_delete_admin" ON musical_group.canciones FOR DELETE USING (musical_group.es_admin());

-- 6.7 POLICIES: SETLISTS
CREATE POLICY "setlists_select_miembro_o_admin" ON musical_group.setlists FOR SELECT USING (
    musical_group.es_admin() OR EXISTS (
        SELECT 1 FROM musical_group.eventos e WHERE e.id = setlists.evento_id AND musical_group.es_miembro_grupo(e.grupo_id)
    )
);
CREATE POLICY "setlists_insert_admin" ON musical_group.setlists FOR INSERT WITH CHECK (musical_group.es_admin());
CREATE POLICY "setlists_update_admin" ON musical_group.setlists FOR UPDATE USING (musical_group.es_admin());
CREATE POLICY "setlists_delete_admin" ON musical_group.setlists FOR DELETE USING (musical_group.es_admin());

-- 6.8 POLICIES: SETLIST_CANCIONES
CREATE POLICY "setlist_canciones_select_miembro_o_admin" ON musical_group.setlist_canciones FOR SELECT USING (
    musical_group.es_admin() OR EXISTS (
        SELECT 1 FROM musical_group.setlists s JOIN musical_group.eventos e ON e.id = s.evento_id
        WHERE s.id = setlist_canciones.setlist_id AND musical_group.es_miembro_grupo(e.grupo_id)
    )
);
CREATE POLICY "setlist_canciones_insert_admin" ON musical_group.setlist_canciones FOR INSERT WITH CHECK (musical_group.es_admin());
CREATE POLICY "setlist_canciones_update_admin" ON musical_group.setlist_canciones FOR UPDATE USING (musical_group.es_admin());
CREATE POLICY "setlist_canciones_delete_admin" ON musical_group.setlist_canciones FOR DELETE USING (musical_group.es_admin());

-- 6.9 POLICIES: COMENTARIOS
CREATE POLICY "comentarios_select_miembro_o_admin" ON musical_group.comentarios FOR SELECT USING (musical_group.es_admin() OR musical_group.es_miembro_grupo(grupo_id));
CREATE POLICY "comentarios_insert_miembro" ON musical_group.comentarios FOR INSERT WITH CHECK (
    musical_group.es_admin() OR (user_id = auth.uid() AND musical_group.es_miembro_grupo(grupo_id))
);
CREATE POLICY "comentarios_update_propietario_o_admin" ON musical_group.comentarios FOR UPDATE USING (musical_group.es_admin() OR user_id = auth.uid());
CREATE POLICY "comentarios_delete_admin" ON musical_group.comentarios FOR DELETE USING (musical_group.es_admin());

-- ============================================================
-- 7. DATOS INICIALES
-- ============================================================
INSERT INTO musical_group.grupos (nombre, descripcion, genero_musical, color_primario, color_secundario) VALUES
('Ensamble Juvenil', 'Grupo de ensamble instrumental para eventos institucionales', 'clásica/contemporánea', '#8b5cf6', '#a78bfa'),
('Banda Rock Alternativo', 'Banda de rock con influencias alternativas y progresivas', 'rock alternativo', '#ef4444', '#f87171'),
('Coro Institucional', 'Coro mixto con repertorio variado', 'coro/sacra', '#3b82f6', '#60a5fa');