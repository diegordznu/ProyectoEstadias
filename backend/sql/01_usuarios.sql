-- Esquema de la base de datos propia para los usuarios del sistema.
-- Ejecutar una sola vez contra la BD de PostgreSQL del proyecto.

CREATE TABLE IF NOT EXISTS usuarios (
    id               SERIAL PRIMARY KEY,
    usuario          VARCHAR(30)  NOT NULL UNIQUE,
    password_hash    VARCHAR(100) NOT NULL,
    tipo_usuario     VARCHAR(20)  NOT NULL CHECK (tipo_usuario IN ('ADMINISTRADOR', 'CAPTURISTA', 'CONSULTA')),
    vigencia_fini    DATE,
    vigencia_fechafin DATE,
    estatus          VARCHAR(10)  NOT NULL DEFAULT 'ACTIVO' CHECK (estatus IN ('ACTIVO', 'INACTIVO'))
);

-- Índice opcional para búsquedas por nombre de usuario.
CREATE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios (usuario);
