import { Pool, type PoolConfig } from 'pg';

let pool: Pool | null = null;

/**
 * La BD propia queda configurada por variables de entorno:
 * bien con DATABASE_URL completa, o con PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGPORT.
 */
export function isDatabaseConfigured(): boolean {
    return Boolean(process.env.DATABASE_URL?.trim() || process.env.PGDATABASE?.trim());
}

/** Parámetros TLS de la cadena: pg los aplica por encima de la opción `ssl`, así que se quitan. */
const PARAMETROS_TLS = ['ssl', 'sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat'];

function sinParametrosTls(cadena: string): string {
    const url = new URL(cadena);
    for (const parametro of PARAMETROS_TLS) url.searchParams.delete(parametro);
    return url.toString();
}

/**
 * Certificado raíz (PEM) con el que se verifica al servidor de la BD.
 * En una variable de entorno de una sola línea, los saltos pueden venir escritos como "\n".
 */
function certificadoCa(): string | null {
    const valor = process.env.DATABASE_CA_CERT?.trim();
    return valor ? valor.replace(/\\n/g, '\n') : null;
}

/**
 * Con DATABASE_CA_CERT la conexión se cifra y se verifica el certificado del servidor
 * (firmado por esa CA y emitido para ese host): nadie en medio puede hacerse pasar
 * por Supabase y quedarse con la contraseña. Sin ella se usa la cadena tal cual.
 */
function configuracionConexion(serverless: boolean): Pick<PoolConfig, 'connectionString' | 'ssl'> {
    const cadena = process.env.DATABASE_URL?.trim() || undefined;
    const ca = certificadoCa();

    if (!ca) {
        if (serverless) {
            throw new Error(
                'Falta configurar DATABASE_CA_CERT: en producción la conexión a la BD debe verificar el certificado del servidor.',
            );
        }
        console.warn('AVISO: sin DATABASE_CA_CERT no se verifica el certificado de la BD (solo aceptable en desarrollo).');
        return { connectionString: cadena };
    }

    return {
        connectionString: cadena ? sinParametrosTls(cadena) : undefined,
        ssl: { ca, rejectUnauthorized: true },
    };
}

export function getPool(): Pool {
    if (!pool) {
        // En Vercel cada instancia de la función atiende una petición a la vez: pocas conexiones
        // y que se cierren pronto, para no agotar el pooler de Supabase.
        const serverless = Boolean(process.env.VERCEL);
        pool = new Pool({
            // Sin DATABASE_URL, pg lee solo las variables PG*.
            ...configuracionConexion(serverless),
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
