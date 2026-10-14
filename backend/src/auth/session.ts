import type { CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import { requiredEnv } from '../config/env';
import type { Usuario } from '../db/usersRepository';

export const SESSION_COOKIE = 'sesion';

/** Un turno laboral. */
const DURACION_MS = 8 * 60 * 60 * 1000;

export const sessionCookieOptions: CookieOptions = {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
};

interface SessionPayload {
    sub: string;
}

export function crearToken(usuario: Usuario): { token: string; maxAge: number } {
    const token = jwt.sign({ sub: String(usuario.id) } satisfies SessionPayload, requiredEnv('JWT_SECRET'), {
        expiresIn: DURACION_MS / 1000,
    });
    return { token, maxAge: DURACION_MS };
}

/** Devuelve el id del usuario o null si el token es inválido o ya expiró. */
export function leerToken(token: string): number | null {
    try {
        const payload = jwt.verify(token, requiredEnv('JWT_SECRET')) as SessionPayload;
        const id = Number(payload.sub);
        return Number.isInteger(id) && id > 0 ? id : null;
    } catch {
        return null;
    }
}

/** Fecha local del servidor en formato 'YYYY-MM-DD', comparable con las vigencias. */
function hoy(): string {
    const ahora = new Date();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${ahora.getFullYear()}-${mes}-${dia}`;
}

/** Motivo por el que el usuario no puede entrar al sistema, o null si tiene acceso. */
export function motivoSinAcceso(usuario: Usuario): string | null {
    if (usuario.estatus !== 'ACTIVO') return 'USUARIO INACTIVO';

    // Una vigencia vacía se toma como sin límite.
    const fecha = hoy();
    if (usuario.vigenciaFini && fecha < usuario.vigenciaFini) return 'USUARIO FUERA DE VIGENCIA';
    if (usuario.vigenciaFechafin && fecha > usuario.vigenciaFechafin) return 'USUARIO FUERA DE VIGENCIA';

    return null;
}
