import type { CookieOptions, Request } from 'express';
import jwt from 'jsonwebtoken';
import { requiredEnv } from '../config/env';
import { hoyLocal } from '../config/tiempo';
import type { Usuario } from '../db/usersRepository';

export const SESSION_COOKIE = 'sesion';

/** Un turno laboral. */
const DURACION_MS = 8 * 60 * 60 * 1000;

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * true si la petición llegó por HTTPS. En Vercel siempre es así; en local se sabe por
 * X-Forwarded-Proto del proxy de Vite (Express solo le cree a loopback, ver app.ts).
 */
export function conexionSegura(req: Request): boolean {
    return Boolean(process.env.VERCEL) || req.secure;
}

/** true si el cliente es esta misma máquina: lo único que se permite sin HTTPS. */
export function clienteLocal(req: Request): boolean {
    return LOOPBACK.has(req.ip ?? '');
}

/** Opciones de la cookie de sesión: `Secure` siempre que la conexión sea HTTPS. */
export function opcionesCookie(req: Request): CookieOptions {
    return {
        httpOnly: true,
        sameSite: 'strict',
        secure: conexionSegura(req),
        path: '/',
    };
}

interface SessionPayload {
    sub: string;
    /** Versión de sesión del usuario al emitir el token (ver sql/04_sesiones.sql). */
    ver: number;
}

export interface DatosToken {
    id: number;
    version: number;
}

export function crearToken(usuario: Usuario, version: number): { token: string; maxAge: number } {
    const payload: SessionPayload = { sub: String(usuario.id), ver: version };
    const token = jwt.sign(payload, requiredEnv('JWT_SECRET'), {
        algorithm: 'HS256',
        expiresIn: DURACION_MS / 1000,
    });
    return { token, maxAge: DURACION_MS };
}

/**
 * Devuelve el id y la versión de sesión, o null si el token es inválido o ya expiró.
 * Un token válido aún puede estar revocado: requireAuth compara la versión con la de la BD.
 */
export function leerToken(token: string): DatosToken | null {
    try {
        const payload = jwt.verify(token, requiredEnv('JWT_SECRET'), { algorithms: ['HS256'] }) as Partial<SessionPayload>;
        const id = Number(payload.sub);
        const version = payload.ver;
        if (!Number.isInteger(id) || id <= 0) return null;
        if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) return null;
        return { id, version };
    } catch {
        return null;
    }
}

/** Motivo por el que el usuario no puede entrar al sistema, o null si tiene acceso. */
export function motivoSinAcceso(usuario: Usuario): string | null {
    if (usuario.estatus !== 'ACTIVO') return 'USUARIO INACTIVO';

    // Una vigencia vacía se toma como sin límite.
    const fecha = hoyLocal();
    if (usuario.vigenciaFini && fecha < usuario.vigenciaFini) return 'USUARIO FUERA DE VIGENCIA';
    if (usuario.vigenciaFechafin && fecha > usuario.vigenciaFechafin) return 'USUARIO FUERA DE VIGENCIA';

    return null;
}
