const MAX_INTENTOS = 5;
const BLOQUEO_MS = 5 * 60 * 1000;

interface Registro {
    fallos: number;
    bloqueadoHasta: number | null;
}

/**
 * Intentos fallidos de login por usuario + IP, en memoria del servidor.
 * Se reinician al reiniciar el servidor, lo cual es aceptable para un bloqueo de minutos.
 */
const registros = new Map<string, Registro>();

const clave = (usuario: string, ip: string): string => `${usuario}|${ip}`;

/** Milisegundos que faltan para desbloquear, o 0 si puede intentar. */
export function tiempoBloqueado(usuario: string, ip: string): number {
    const registro = registros.get(clave(usuario, ip));
    if (!registro?.bloqueadoHasta) return 0;

    const restante = registro.bloqueadoHasta - Date.now();
    if (restante > 0) return restante;

    // El bloqueo ya venció: se le dan otros 5 intentos.
    registros.delete(clave(usuario, ip));
    return 0;
}

export function registrarFallo(usuario: string, ip: string): void {
    const key = clave(usuario, ip);
    const registro = registros.get(key) ?? { fallos: 0, bloqueadoHasta: null };
    registro.fallos += 1;
    if (registro.fallos >= MAX_INTENTOS) registro.bloqueadoHasta = Date.now() + BLOQUEO_MS;
    registros.set(key, registro);
}

export function limpiarFallos(usuario: string, ip: string): void {
    registros.delete(clave(usuario, ip));
}
