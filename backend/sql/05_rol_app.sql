-- Rol de mínimo privilegio para el backend.
-- Hasta ahora el backend se conectaba como "postgres" (dueño de todo y con BYPASSRLS):
-- un fallo en la app expondría la BD completa. Con este rol la app solo puede hacer
-- lo que realmente necesita sobre sus propias tablas.
--
-- Ejecutar una vez en Supabase (SQL Editor), DESPUÉS de 01, 03 y 04. Es idempotente.
-- Luego asignar la contraseña en una consulta aparte (no se guarda en este archivo):
--     ALTER ROLE app_inventario PASSWORD '<contraseña larga y aleatoria>';
-- y cambiar DATABASE_URL para usar el usuario "app_inventario.<proyecto>" (ver .env.example).

-- Se crea sin atributos especiales (por omisión: sin SUPERUSER, BYPASSRLS, REPLICATION,
-- CREATEDB ni CREATEROLE). No se usa ALTER ROLE para "quitarlos": en Supabase el usuario
-- postgres no es superusuario y no puede tocar esos atributos.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_inventario') THEN
        CREATE ROLE app_inventario LOGIN NOINHERIT;
    END IF;
END
$$;

-- Comprobación: si el rol ya existía con privilegios de más, se detiene todo el script.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_roles
         WHERE rolname = 'app_inventario'
           AND (rolsuper OR rolbypassrls OR rolreplication OR rolcreaterole OR rolcreatedb)
    ) THEN
        RAISE EXCEPTION 'app_inventario tiene privilegios especiales: bórrelo (DROP ROLE app_inventario) y vuelva a ejecutar este script';
    END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_inventario;

-- Usuarios: CRUD completo (pantalla de control de usuarios y login).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios TO app_inventario;
GRANT USAGE, SELECT ON SEQUENCE public.usuarios_id_seq TO app_inventario;

-- Catálogos: solo lectura (altas y bajas siguen siendo por SQL).
GRANT SELECT ON public.materiales, public.ubicaciones TO app_inventario;

-- Movimientos: consultar y registrar; nunca modificar ni borrar el historial.
GRANT SELECT, INSERT ON public.movimientos TO app_inventario;

-- Vistas (security_invoker: aplican los permisos y RLS de las tablas de arriba).
GRANT SELECT ON public.v_movimientos, public.v_inventario TO app_inventario;

-- RLS sigue activo para todos; estas políticas abren las tablas solo a este rol.
-- La API pública de Supabase (anon / authenticated) sigue sin ver nada.
DROP POLICY IF EXISTS app_inventario_todo ON public.usuarios;
CREATE POLICY app_inventario_todo ON public.usuarios
    FOR ALL TO app_inventario USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS app_inventario_leer ON public.materiales;
CREATE POLICY app_inventario_leer ON public.materiales
    FOR SELECT TO app_inventario USING (true);

DROP POLICY IF EXISTS app_inventario_leer ON public.ubicaciones;
CREATE POLICY app_inventario_leer ON public.ubicaciones
    FOR SELECT TO app_inventario USING (true);

DROP POLICY IF EXISTS app_inventario_leer ON public.movimientos;
CREATE POLICY app_inventario_leer ON public.movimientos
    FOR SELECT TO app_inventario USING (true);

DROP POLICY IF EXISTS app_inventario_registrar ON public.movimientos;
CREATE POLICY app_inventario_registrar ON public.movimientos
    FOR INSERT TO app_inventario WITH CHECK (true);
