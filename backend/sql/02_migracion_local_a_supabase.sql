-- Migracion de usuarios desde el PostgreSQL local (grupoarmas) hacia Supabase.
-- Conserva los password_hash originales: los usuarios siguen con su misma clave.

INSERT INTO public.usuarios (id, usuario, password_hash, tipo_usuario, vigencia_fini, vigencia_fechafin, estatus)
VALUES
    (2, 'PRODUCCION', '$2b$10$.EB5jZfmwI0sE5lmPJp9BeLL3IcgaxIItN/0.fkLU1KBL4tjc89RC', 'CAPTURISTA', NULL, NULL, 'ACTIVO'),
    (3, 'GROSAS',     '$2b$10$EQRhzo1RdDad7DLwBeIXmuVXikFfEFzpvRie9Kw808NXZxR5Mu6.6', 'CONSULTA',  NULL, NULL, 'ACTIVO')
ON CONFLICT (usuario) DO NOTHING;

-- La secuencia debe continuar despues del id mas alto migrado.
SELECT setval(pg_get_serial_sequence('public.usuarios', 'id'), (SELECT COALESCE(MAX(id), 0) FROM public.usuarios), true);
