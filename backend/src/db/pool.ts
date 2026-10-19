import { Pool } from 'pg';

let pool: Pool | null = null;

/**
 * La BD propia queda configurada por variables de entorno:
 * bien con DATABASE_URL completa, o con PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGPORT.
 */
export function isDatabaseConfigured(): boolean {
    return Boolean(process.env.DATABASE_URL?.trim() || process.env.PGDATABASE?.trim());
}

export function getPool(): Pool {
    // Sin DATABASE_URL, pg lee solo las variables PG*.
    pool ??= new Pool({ connectionString: process.env.DATABASE_URL?.trim() || undefined });
    return pool;
}

export async function closePool(): Promise<void> {
    const actual = pool;
    pool = null;
    await actual?.end();
}
