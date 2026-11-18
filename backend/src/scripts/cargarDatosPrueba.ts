/**
 * Carga en la BD los materiales, proveedores y movimientos de PRUEBA de sql/04_datos_prueba.sql.
 * Uso: npm run cargar-datos-prueba
 *
 * El script SQL corre en una sola transacción y se niega a cargar si ya hay movimientos.
 */
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { closePool, getPool, isDatabaseConfigured } from '../db/pool';

const ARCHIVO = path.resolve(__dirname, '../../sql/04_datos_prueba.sql');

async function main(): Promise<void> {
    if (!isDatabaseConfigured()) {
        throw new Error('Configure DATABASE_URL en el .env para cargar los datos de prueba.');
    }

    const sql = await readFile(ARCHIVO, 'utf8');
    const pool = getPool();
    await pool.query(sql);

    const { rows } = await pool.query<{ materiales: number; proveedores: number; movimientos: number }>(
        `SELECT (SELECT count(*) FROM materiales)::int AS materiales,
                (SELECT count(*) FROM ubicaciones WHERE tipo = 'PROVEEDOR')::int AS proveedores,
                (SELECT count(*) FROM movimientos)::int AS movimientos`,
    );
    const { materiales, proveedores, movimientos } = rows[0];
    console.log(`Datos de prueba cargados: ${materiales} materiales, ${proveedores} proveedores, ${movimientos} movimientos.`);
}

main()
    .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(() => closePool());
