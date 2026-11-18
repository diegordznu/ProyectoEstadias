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
        // En Vercel cada instancia de la función atiende una petición a la vez: pocas conexiones
        // y que se cierren pronto, para no agotar el pooler de Supabase.
        const serverless = Boolean(process.env.VERCEL);
        pool = new Pool({
            // Sin DATABASE_URL, pg lee solo las variables PG*.
            connectionString: process.env.DATABASE_URL?.trim() || undefined,
            max: serverless ? 3 : 10,
            idleTimeoutMillis: serverless ? 5_000 : 30_000,
            connectionTimeoutMillis: 10_000,
        });
        // Sin este manejador, un error en una conexión inactiva (p. ej. el pooler la corta)
        // tumbaría el proceso completo.
        pool.on('error', (error) => {
            console.error('Error en una conexión inactiva de PostgreSQL:', error.message);
        });
    }
    return pool;
}

export async function closePool(): Promise<void> {
    const actual = pool;
    pool = null;
    await actual?.end();
}
