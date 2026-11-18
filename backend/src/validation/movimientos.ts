import type { MovimientoInput } from '../db/inventarioRepository';
import { ahoraLocal } from '../config/tiempo';
import { soloTexto } from './users';

export interface MovimientoPayload {
    fecha?: unknown;
    materialId?: unknown;
    lote?: unknown;
    origenId?: unknown;
    destinoId?: unknown;
    cantidad?: unknown;
}

export type ResultadoMovimiento = { ok: true; value: MovimientoInput } | { ok: false; errores: string[] };

const LOTE_MAXIMO = 30;
const CANTIDAD_MAXIMA = 1_000_000;
/** Acepta 'YYYY-MM-DD HH:mm' o el formato de <input type="datetime-local"> 'YYYY-MM-DDTHH:mm'. */
const FECHA_HORA = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/;

function normalizarFecha(valor: string): string | null {
    const partes = FECHA_HORA.exec(valor);
    if (!partes) return null;
    const [anio, mes, dia, hora, minuto] = partes.slice(1).map(Number);
    // En UTC solo se valida que la fecha exista (sin depender de la zona del servidor).
    const fecha = new Date(Date.UTC(anio, mes - 1, dia, hora, minuto));
    const valida =
        fecha.getUTCFullYear() === anio &&
        fecha.getUTCMonth() === mes - 1 &&
        fecha.getUTCDate() === dia &&
        fecha.getUTCHours() === hora &&
        fecha.getUTCMinutes() === minuto;
    return valida ? `${partes[1]}-${partes[2]}-${partes[3]} ${partes[4]}:${partes[5]}` : null;
}

function idPositivo(valor: unknown): number | null {
    const n = typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : valor;
    return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : null;
}

/** Normaliza y valida un movimiento antes de llegar a la BD. */
export function validarMovimiento(payload: MovimientoPayload, ahora: string = ahoraLocal()): ResultadoMovimiento {
    const errores: string[] = [];

    const textoFecha = soloTexto(payload.fecha);
    const fecha = textoFecha ? normalizarFecha(textoFecha) : null;
    if (!textoFecha) {
        errores.push('LA FECHA ES OBLIGATORIA');
    } else if (!fecha) {
        errores.push('LA FECHA NO ES VÁLIDA (FORMATO AAAA-MM-DD HH:MM)');
    } else if (fecha > ahora) {
        errores.push('LA FECHA NO PUEDE SER FUTURA');
    }

    const materialId = idPositivo(payload.materialId);
    if (materialId === null) errores.push('EL MATERIAL ES OBLIGATORIO');

    const lote = soloTexto(payload.lote).toUpperCase();
    if (!lote) {
        errores.push('EL LOTE ES OBLIGATORIO');
    } else if (lote.length > LOTE_MAXIMO) {
        errores.push(`EL LOTE NO PUEDE TENER MÁS DE ${LOTE_MAXIMO} CARACTERES`);
    }

    const origenId = idPositivo(payload.origenId);
    if (origenId === null) errores.push('EL ORIGEN ES OBLIGATORIO');

    const destinoId = idPositivo(payload.destinoId);
    if (destinoId === null) errores.push('EL DESTINO ES OBLIGATORIO');

    if (origenId !== null && origenId === destinoId) {
        errores.push('EL ORIGEN Y EL DESTINO DEBEN SER DIFERENTES');
    }

    const cantidad = payload.cantidad;
    if (typeof cantidad !== 'number' || !Number.isInteger(cantidad) || cantidad <= 0) {
        errores.push('LA CANTIDAD DEBE SER UN NÚMERO ENTERO MAYOR A 0');
    } else if (cantidad > CANTIDAD_MAXIMA) {
        errores.push(`LA CANTIDAD NO PUEDE SER MAYOR A ${CANTIDAD_MAXIMA.toLocaleString('es-MX')}`);
    }

    if (errores.length > 0) return { ok: false, errores };

    return {
        ok: true,
        value: {
            fecha: fecha!,
            materialId: materialId!,
            lote,
            origenId: origenId!,
            destinoId: destinoId!,
            cantidad: cantidad as number,
        },
    };
}
