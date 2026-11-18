import type { Pool, PoolClient } from 'pg';

export type TipoUbicacion = 'PLANTA' | 'PROVEEDOR' | 'CONSUMO';

export interface Material {
    id: number;
    sku: string;
    nombre: string;
    activo: boolean;
}

export interface Ubicacion {
    id: number;
    nombre: string;
    tipo: TipoUbicacion;
    activo: boolean;
}

/** Movimiento ya con nombres (vista v_movimientos). */
export interface Movimiento {
    id: number;
    /** 'YYYY-MM-DD HH:mm' */
    fecha: string;
    /** SKU del material. */
    material: string;
    lote: string;
    origen: string;
    destino: string;
    cantidad: number;
}

export interface InventarioMaterial {
    sku: string;
    nombre: string;
    /** Existencia por nombre de planta. */
    existencias: Record<string, number>;
    total: number;
}

export interface Inventario {
    /** Plantas activas (o inactivas con existencias), en el orden de las columnas. */
    plantas: string[];
    materiales: InventarioMaterial[];
}

export interface MovimientoInput {
    /** 'YYYY-MM-DD HH:mm' (hora local de la planta). */
    fecha: string;
    materialId: number;
    lote: string;
    origenId: number;
    destinoId: number;
    cantidad: number;
}

/** Regla de negocio violada: el mensaje se muestra tal cual al usuario. */
export class MovimientoRechazado extends Error {
    constructor(
        message: string,
        readonly status: 400 | 409,
    ) {
        super(message);
        this.name = 'MovimientoRechazado';
    }
}

const COLUMNAS_MOVIMIENTO = `id::int AS id,
           to_char(fecha, 'YYYY-MM-DD HH24:MI') AS fecha,
           material, lote, origen, destino, cantidad`;

/** Inventario y movimientos sobre la BD propia. Requiere el esquema de sql/03_inventario.sql. */
export class InventarioRepository {
    constructor(private readonly pool: Pool) {}

    async listarMateriales(): Promise<Material[]> {
        const { rows } = await this.pool.query<Material>(
            'SELECT id::int AS id, sku, nombre, estatus AS activo FROM materiales ORDER BY sku',
        );
        return rows;
    }

    async listarUbicaciones(): Promise<Ubicacion[]> {
        const { rows } = await this.pool.query<Ubicacion>(
            `SELECT id::int AS id, nombre, tipo, estatus AS activo
               FROM ubicaciones
              ORDER BY CASE tipo WHEN 'PLANTA' THEN 0 WHEN 'PROVEEDOR' THEN 1 ELSE 2 END, nombre`,
        );
        return rows;
    }

    /** Existencias por material y planta, calculadas a partir de los movimientos (vista v_inventario). */
    async inventario(): Promise<Inventario> {
        const [plantas, filas] = await Promise.all([
            this.pool.query<{ nombre: string; activo: boolean }>(
                "SELECT nombre, estatus AS activo FROM ubicaciones WHERE tipo = 'PLANTA' ORDER BY nombre",
            ),
            this.pool.query<{ sku: string; nombre: string; planta: string; existencia: number }>(
                'SELECT sku, nombre, planta, existencia::int AS existencia FROM v_inventario ORDER BY sku',
            ),
        ]);

        // Una planta inactiva se sigue mostrando mientras tenga existencias: si no, sus piezas
        // desaparecerían del total global.
        const conExistencia = new Set(filas.rows.filter((f) => f.existencia !== 0).map((f) => f.planta));
        const nombresPlantas = plantas.rows.filter((p) => p.activo || conExistencia.has(p.nombre)).map((p) => p.nombre);
        const porSku = new Map<string, InventarioMaterial>();

        for (const fila of filas.rows) {
            let material = porSku.get(fila.sku);
            if (!material) {
                const existencias = Object.fromEntries(nombresPlantas.map((p) => [p, 0]));
                material = { sku: fila.sku, nombre: fila.nombre, existencias, total: 0 };
                porSku.set(fila.sku, material);
            }
            if (fila.planta in material.existencias) {
                material.existencias[fila.planta] = fila.existencia;
                material.total += fila.existencia;
            }
        }

        return { plantas: nombresPlantas, materiales: [...porSku.values()] };
    }

    /** Movimientos (más reciente primero). Con `planta`, solo donde esa planta es origen o destino. */
    async listarMovimientos(planta?: string): Promise<Movimiento[]> {
        const { rows } = await this.pool.query<Movimiento>(
            `SELECT ${COLUMNAS_MOVIMIENTO}
               FROM v_movimientos
              WHERE $1::text IS NULL OR origen = $1 OR destino = $1
              ORDER BY fecha DESC, id DESC`,
            [planta ?? null],
        );
        return rows;
    }

    /**
     * Registra un movimiento validando las reglas que la BD por sí sola no puede garantizar:
     * - material y ubicaciones existentes y activos
     * - si sale de una planta, ese lote debe tener existencia suficiente en ella,
     *   y la existencia del lote no puede quedar negativa en ningún momento
     *   (también impide capturar con fecha anterior una salida que no tenía material)
     */
    async registrarMovimiento(input: MovimientoInput, usuarioId: number | null): Promise<Movimiento> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const material = await this.buscarMaterial(client, input.materialId);
            const origen = await this.buscarUbicacion(client, input.origenId, 'ORIGEN');
            const destino = await this.buscarUbicacion(client, input.destinoId, 'DESTINO');
            validarRuta(origen, destino);

            if (origen.tipo === 'PLANTA') {
                // Serializa las salidas del mismo lote desde la misma planta: dos capturas
                // simultáneas no pueden gastar la misma existencia.
                await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
                    `movimiento:${material.id}:${input.lote}:${origen.id}`,
                ]);
                await validarExistencia(client, input, material, origen);
            }

            const { rows } = await client.query<{ id: number }>(
                `INSERT INTO movimientos
                    (fecha, material_id, lote, origen_id, origen_tipo, destino_id, destino_tipo, cantidad, usuario_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING id::int AS id`,
                [
                    input.fecha,
                    material.id,
                    input.lote,
                    origen.id,
                    origen.tipo,
                    destino.id,
                    destino.tipo,
                    input.cantidad,
                    usuarioId,
                ],
            );

            const creado = await client.query<Movimiento>(
                `SELECT ${COLUMNAS_MOVIMIENTO} FROM v_movimientos WHERE id = $1`,
                [rows[0].id],
            );

            await client.query('COMMIT');
            return creado.rows[0];
        } catch (error) {
            await client.query('ROLLBACK').catch(() => undefined);
            throw error;
        } finally {
            client.release();
        }
    }

    private async buscarMaterial(client: PoolClient, id: number): Promise<Material> {
        const { rows } = await client.query<Material>(
            'SELECT id::int AS id, sku, nombre, estatus AS activo FROM materiales WHERE id = $1',
            [id],
        );
        const material = rows[0];
        if (!material) throw new MovimientoRechazado('EL MATERIAL NO EXISTE', 400);
        if (!material.activo) throw new MovimientoRechazado(`EL MATERIAL ${material.sku} ESTÁ INACTIVO`, 400);
        return material;
    }

    private async buscarUbicacion(client: PoolClient, id: number, rol: 'ORIGEN' | 'DESTINO'): Promise<Ubicacion> {
        const { rows } = await client.query<Ubicacion>(
            'SELECT id::int AS id, nombre, tipo, estatus AS activo FROM ubicaciones WHERE id = $1',
            [id],
        );
        const ubicacion = rows[0];
        if (!ubicacion) throw new MovimientoRechazado(`EL ${rol} NO EXISTE`, 400);
        if (!ubicacion.activo) throw new MovimientoRechazado(`EL ${rol} ${ubicacion.nombre.toUpperCase()} ESTÁ INACTIVO`, 400);
        return ubicacion;
    }
}

function validarRuta(origen: Ubicacion, destino: Ubicacion): void {
    if (origen.id === destino.id) {
        throw new MovimientoRechazado('EL ORIGEN Y EL DESTINO DEBEN SER DIFERENTES', 400);
    }
    if (origen.tipo === 'CONSUMO') {
        throw new MovimientoRechazado('UN CONSUMO NO PUEDE SER ORIGEN', 400);
    }
    if (destino.tipo === 'PROVEEDOR') {
        throw new MovimientoRechazado('UN PROVEEDOR NO PUEDE SER DESTINO', 400);
    }
    if (origen.tipo !== 'PLANTA' && destino.tipo !== 'PLANTA') {
        throw new MovimientoRechazado('EL MOVIMIENTO DEBE SALIR DE UNA PLANTA O LLEGAR A UNA PLANTA', 400);
    }
}

/**
 * Revisa la existencia del lote en la planta de origen, en orden cronológico e incluyendo
 * el movimiento nuevo: el saldo no puede bajar de 0 en ningún momento.
 */
async function validarExistencia(
    client: PoolClient,
    input: MovimientoInput,
    material: Material,
    origen: Ubicacion,
): Promise<void> {
    const { rows } = await client.query<{ actual: number; minimo: number }>(
        `WITH efectos AS (
             SELECT fecha, id,
                    CASE WHEN destino_id = $3 THEN cantidad ELSE -cantidad END AS delta
               FROM movimientos
              WHERE material_id = $1 AND lote = $2 AND (origen_id = $3 OR destino_id = $3)
             UNION ALL
             SELECT $4::timestamp, NULL, -$5::int
         ),
         saldos AS (
             -- En la misma fecha y hora se aplican primero las entradas.
             SELECT SUM(delta) OVER (ORDER BY fecha, delta DESC, id NULLS LAST) AS saldo
               FROM efectos
         )
         SELECT (SELECT COALESCE(SUM(delta), 0) FROM efectos)::int + $5::int AS actual,
                MIN(saldo)::int AS minimo
           FROM saldos`,
        [material.id, input.lote, origen.id, input.fecha, input.cantidad],
    );

    const { actual, minimo } = rows[0];
    if (minimo >= 0) return;

    if (actual < input.cantidad) {
        throw new MovimientoRechazado(
            `EXISTENCIA INSUFICIENTE: EL LOTE ${input.lote} DE ${material.sku} TIENE ${actual} EN ${origen.nombre.toUpperCase()}`,
            409,
        );
    }
    throw new MovimientoRechazado(
        `EN ESA FECHA EL LOTE ${input.lote} DE ${material.sku} NO TENÍA EXISTENCIA SUFICIENTE EN ${origen.nombre.toUpperCase()}`,
        409,
    );
}
