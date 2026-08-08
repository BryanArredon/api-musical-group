-- ============================================================
-- SEED MASIVO: dev_bryan / schema musical_group
-- Orden: perfiles → avisos_privacidad → aceptaciones_privacidad
--        categorias → activos_v2 → solicitudes_v2
--        solicitud_activos_v2 → devoluciones_v2
--        solicitudes_arco → auditoria
-- ============================================================
SET search_path TO musical_group, public;

-- Limpiar datos previos respetando FK (orden inverso)
TRUNCATE musical_group.auditoria                CASCADE;
TRUNCATE musical_group.solicitudes_arco         CASCADE;
TRUNCATE musical_group.aceptaciones_privacidad  CASCADE;
TRUNCATE musical_group.avisos_privacidad        CASCADE;
TRUNCATE musical_group.devoluciones_v2          CASCADE;
TRUNCATE musical_group.solicitud_activos_v2     CASCADE;
TRUNCATE musical_group.solicitudes_v2           CASCADE;
TRUNCATE musical_group.activos_v2               CASCADE;
TRUNCATE musical_group.categorias               CASCADE;
TRUNCATE musical_group.perfiles                 CASCADE;

-- ============================================================
-- 1. PERFILES (25 usuarios: 5 admins + 20 colaboradores)
-- ============================================================
INSERT INTO musical_group.perfiles
    (id, nombre_completo, correo, telefono, rol, departamento, activo, privacidad_aceptada, privacidad_aceptada_en)
VALUES
-- Administradores
('a0000001-0000-0000-0000-000000000001','Carlos Mendoza Ruiz',       'admin.carlos@grupomusical.mx',  '5551001001','administrador','Dirección',          true, true, NOW() - INTERVAL '60 days'),
('a0000001-0000-0000-0000-000000000002','Laura Vega Torres',         'admin.laura@grupomusical.mx',   '5551001002','administrador','Administración',     true, true, NOW() - INTERVAL '55 days'),
('a0000001-0000-0000-0000-000000000003','Roberto Sánchez Gil',       'admin.roberto@grupomusical.mx', '5551001003','administrador','Logística',          true, true, NOW() - INTERVAL '50 days'),
('a0000001-0000-0000-0000-000000000004','Mariana López Cruz',        'admin.mariana@grupomusical.mx', '5551001004','administrador','Recursos Humanos',   true, true, NOW() - INTERVAL '45 days'),
('a0000001-0000-0000-0000-000000000005','Diego Herrera Nava',        'admin.diego@grupomusical.mx',   '5551001005','administrador','Producción',         true, true, NOW() - INTERVAL '40 days'),
