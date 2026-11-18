/**
 * Zona horaria del negocio. El servidor (Vercel) corre en UTC, así que "hoy" y "ahora"
 * se calculan siempre en esta zona y no en la del sistema.
 */
export const ZONA_HORARIA = process.env.APP_TIMEZONE?.trim() || 'America/Mexico_City';

// Lanza RangeError al arrancar si APP_TIMEZONE no es una zona válida.
const formato = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});

/** Fecha y hora en la zona del negocio, formato 'YYYY-MM-DD HH:mm' (misma forma que se guarda). */
export function ahoraLocal(fecha: Date = new Date()): string {
    const partes = Object.fromEntries(formato.formatToParts(fecha).map((p) => [p.type, p.value]));
    return `${partes.year}-${partes.month}-${partes.day} ${partes.hour}:${partes.minute}`;
}

/** Fecha en la zona del negocio, formato 'YYYY-MM-DD' (comparable con las vigencias). */
export function hoyLocal(fecha: Date = new Date()): string {
    return ahoraLocal(fecha).slice(0, 10);
}
