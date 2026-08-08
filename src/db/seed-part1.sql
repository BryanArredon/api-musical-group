-- ============================================================
-- SEED PARTE 1: avisos_privacidad + perfiles + categorias
-- ============================================================
SET search_path TO musical_group, public;

-- ── 1. avisos_privacidad (3) ─────────────────────────────────
INSERT INTO musical_group.avisos_privacidad (id, version, titulo, contenido_integral, contenido_simplificado, activo, fecha_vigencia) VALUES
('a0000001-0000-0000-0000-000000000001', '1.0', 'Aviso de Privacidad Integral v1.0',
 'Este aviso describe el tratamiento de datos personales conforme a la LGPDPPSO. El responsable es Grupo Musical UTNG. Los datos se utilizan para gestión de activos, préstamos y comunicaciones internas. Los titulares pueden ejercer derechos ARCO escribiendo a privacidad@grupomusical.edu.mx. Los datos se conservan por 5 años.',
 'Usamos tus datos para gestionar préstamos de equipos. Puedes pedir acceso, corrección o eliminación en privacidad@grupomusical.edu.mx.',
 FALSE, '2024-01-01'),
('a0000001-0000-0000-0000-000000000002', '2.0', 'Aviso de Privacidad Integral v2.0',
 'Versión actualizada del aviso de privacidad conforme a reformas 2025. Se incluyen nuevas finalidades relacionadas con auditoría digital y trazabilidad de equipos musicales. El responsable es Grupo Musical UTNG. Se implementan medidas técnicas y administrativas de seguridad incluyendo cifrado AES-256.',
 'Actualizamos nuestro aviso. Seguimos cuidando tus datos y ahora incluimos auditoría digital. Contáctanos en privacidad@grupomusical.edu.mx.',
 TRUE, '2025-01-01'),
('a0000001-0000-0000-0000-000000000003', '2.1', 'Aviso de Privacidad Simplificado v2.1',
 'Aviso simplificado para colaboradores nuevos. Los datos recabados son: nombre, correo, teléfono y departamento. Finalidad: control de préstamos de activos musicales. Base legal: relación contractual. Conservación: duración de la relación más 2 años.',
 'Recabamos tu nombre, correo y teléfono para el control de préstamos de equipos.',
 TRUE, '2025-06-01');

-- ── 2. perfiles (20: 3 admin + 17 colaboradores) ─────────────
INSERT INTO musical_group.perfiles (id, nombre_completo, correo, telefono, rol, departamento, activo, privacidad_aceptada, privacidad_aceptada_en) VALUES
('b0000001-0000-0000-0000-000000000001','Carlos Admin Mendoza','admin@grupomusical.edu.mx','6141000001','administrador','Dirección',TRUE,TRUE,'2025-01-15 09:00:00+00'),
('b0000001-0000-0000-0000-000000000002','Laura Admin Torres','laura.admin@grupomusical.edu.mx','6141000002','administrador','Coordinación',TRUE,TRUE,'2025-01-15 09:05:00+00'),
('b0000001-0000-0000-0000-000000000003','Roberto Admin García','roberto.admin@grupomusical.edu.mx','6141000003','administrador','Logística',TRUE,TRUE,'2025-01-15 09:10:00+00'),
('b0000001-0000-0000-0000-000000000004','Ana Martínez López','ana.martinez@grupomusical.edu.mx','6141000004','colaborador','Cuerdas',TRUE,TRUE,'2025-02-01 10:00:00+00'),
('b0000001-0000-0000-0000-000000000005','Luis Hernández Ríos','luis.hernandez@grupomusical.edu.mx','6141000005','colaborador','Vientos',TRUE,TRUE,'2025-02-01 10:05:00+00'),
('b0000001-0000-0000-0000-000000000006','María González Cruz','maria.gonzalez@grupomusical.edu.mx','6141000006','colaborador','Percusión',TRUE,TRUE,'2025-02-01 10:10:00+00'),
('b0000001-0000-0000-0000-000000000007','José Ramírez Fuentes','jose.ramirez@grupomusical.edu.mx','6141000007','colaborador','Cuerdas',TRUE,TRUE,'2025-02-02 11:00:00+00'),
('b0000001-0000-0000-0000-000000000008','Sofía Díaz Vega','sofia.diaz@grupomusical.edu.mx','6141000008','colaborador','Teclados',TRUE,TRUE,'2025-02-02 11:05:00+00'),
('b0000001-0000-0000-0000-000000000009','Miguel Flores Soto','miguel.flores@grupomusical.edu.mx','6141000009','colaborador','Vientos',TRUE,TRUE,'2025-02-02 11:10:00+00'),
('b0000001-0000-0000-0000-000000000010','Isabella Moreno Peña','isabella.moreno@grupomusical.edu.mx','6141000010','colaborador','Percusión',TRUE,TRUE,'2025-02-03 12:00:00+00');
INSERT INTO musical_group.perfiles (id, nombre_completo, correo, telefono, rol, departamento, activo, privacidad_aceptada, privacidad_aceptada_en) VALUES
('b0000001-0000-0000-0000-000000000011','Diego Castro Vargas','diego.castro@grupomusical.edu.mx','6141000011','colaborador','Cuerdas',TRUE,TRUE,'2025-02-03 12:05:00+00'),
('b0000001-0000-0000-0000-000000000012','Valentina Ruiz Medina','valentina.ruiz@grupomusical.edu.mx','6141000012','colaborador','Vientos',TRUE,TRUE,'2025-02-03 12:10:00+00'),
('b0000001-0000-0000-0000-000000000013','Andrés Jiménez Alba','andres.jimenez@grupomusical.edu.mx','6141000013','colaborador','Teclados',TRUE,TRUE,'2025-02-04 13:00:00+00'),
('b0000001-0000-0000-0000-000000000014','Camila Reyes Ponce','camila.reyes@grupomusical.edu.mx','6141000014','colaborador','Percusión',TRUE,TRUE,'2025-02-04 13:05:00+00'),
('b0000001-0000-0000-0000-000000000015','Fernando Luna Ortiz','fernando.luna@grupomusical.edu.mx','6141000015','colaborador','Cuerdas',TRUE,TRUE,'2025-02-04 13:10:00+00'),
('b0000001-0000-0000-0000-000000000016','Daniela Navarro Ibarra','daniela.navarro@grupomusical.edu.mx','6141000016','colaborador','Vientos',TRUE,FALSE,NULL),
('b0000001-0000-0000-0000-000000000017','Sebastián Guerrero Leal','sebastian.guerrero@grupomusical.edu.mx','6141000017','colaborador','Percusión',TRUE,FALSE,NULL),
('b0000001-0000-0000-0000-000000000018','Natalia Espinoza Prado','natalia.espinoza@grupomusical.edu.mx','6141000018','colaborador','Teclados',TRUE,TRUE,'2025-02-05 14:00:00+00'),
('b0000001-0000-0000-0000-000000000019','Ricardo Aguilar Mata','ricardo.aguilar@grupomusical.edu.mx','6141000019','colaborador','Cuerdas',TRUE,TRUE,'2025-02-05 14:05:00+00'),
('b0000001-0000-0000-0000-000000000020','Paulina Serrano Vidal','paulina.serrano@grupomusical.edu.mx','6141000020','colaborador','Vientos',FALSE,TRUE,'2025-02-05 14:10:00+00');

-- ── 3. categorias (8) ────────────────────────────────────────
INSERT INTO musical_group.categorias (id, nombre, descripcion, icono, color, activa) VALUES
('c0000001-0000-0000-0000-000000000001','Cuerdas','Instrumentos de cuerda: guitarras, violines, chelos, contrabajos','🎸','#6366f1',TRUE),
('c0000001-0000-0000-0000-000000000002','Vientos','Instrumentos de viento: trompetas, saxofones, flautas, clarinetes','🎺','#f59e0b',TRUE),
('c0000001-0000-0000-0000-000000000003','Percusión','Instrumentos de percusión: baterías, timbales, xilófonos, congas','🥁','#ef4444',TRUE),
('c0000001-0000-0000-0000-000000000004','Teclados','Pianos, sintetizadores, órganos electrónicos','🎹','#10b981',TRUE),
('c0000001-0000-0000-0000-000000000005','Amplificación','Amplificadores, bocinas, monitores de escenario','🔊','#3b82f6',TRUE),
('c0000001-0000-0000-0000-000000000006','Audio','Mezcladores, interfaces de audio, micrófonos, auriculares','🎙️','#8b5cf6',TRUE),
('c0000001-0000-0000-0000-000000000007','Accesorios','Cables, atriles, estuches, correas, pedales de efecto','🎵','#64748b',TRUE),
('c0000001-0000-0000-0000-000000000008','Iluminación','Luces de escenario, strobes, controladores DMX','💡','#f97316',FALSE);
