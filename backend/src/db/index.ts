import { MemoryUsersRepository } from './memoryUsersRepository';
import { getPool, isDatabaseConfigured } from './pool';
import { PostgresUsersRepository } from './postgresUsersRepository';
import type { UsersRepository } from './usersRepository';

/**
 * Selecciona la implementación de usuarios:
 * - con DATABASE_URL o PGDATABASE configuradas => PostgreSQL (BD propia)
 * - sin configurar => memoria (datos de ejemplo, se pierden al reiniciar)
 */
export function createUsersRepository(): UsersRepository {
    if (isDatabaseConfigured()) {
        console.log('[usuarios] Usando PostgreSQL como repositorio.');
        return new PostgresUsersRepository(getPool());
    }

    console.warn(
        '[usuarios] No hay variables de PostgreSQL configuradas: se usará una base en memoria ' +
            '(los cambios no persisten tras reiniciar el servidor).',
    );
    return new MemoryUsersRepository();
}
