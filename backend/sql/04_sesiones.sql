-- Versión de sesión por usuario: cada token lleva la versión vigente al iniciar sesión.
-- Cerrar sesión o cambiarle la contraseña al usuario la incrementa, y con eso todos
-- sus tokens anteriores dejan de servir aunque no hayan expirado.
--
-- Ejecutar una vez en Supabase (SQL Editor) ANTES de desplegar el backend que la usa.
-- Es idempotente.

ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS sesion_version INTEGER NOT NULL DEFAULT 0;
