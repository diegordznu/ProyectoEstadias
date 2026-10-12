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
    if (!pool) {
        const url = process.env.DATABASE_URL?.trim();
        pool = url
            ? new Pool({ connectionString: url })
            : new Pool({
                  host: process.env.PGHOST,
                  port: Number(process.env.PGPORT ?? 5432),
                  user: process.env.PGUSER,
                  password: process.env.PGPASSWORD,
                  database: process.env.PGDATABASE,
              });
    }
    return pool;
}

export async function closePool(): Promise<void> {
    if (!pool) return;
    const actual = pool;
    pool = null;
    await actual.end();
}
