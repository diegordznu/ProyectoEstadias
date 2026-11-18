import { getPool } from './pool';
import { PostgresUsersRepository } from './postgresUsersRepository';
import type { UsersRepository } from './usersRepository';

/** Los usuarios viven siempre en la BD (Supabase): no hay usuarios de ejemplo. */
export function createUsersRepository(): UsersRepository {
    return new PostgresUsersRepository(getPool());
}
