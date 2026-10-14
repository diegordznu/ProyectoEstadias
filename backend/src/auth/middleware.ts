import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Usuario, UsersRepository } from '../db/usersRepository';
import { SESSION_COOKIE, leerToken, motivoSinAcceso, sessionCookieOptions } from './session';

declare global {
    namespace Express {
        interface Request {
            /** Usuario de la sesión, disponible después de requireAuth. */
            usuario?: Usuario;
        }
    }
}

function sinSesion(res: Response, mensaje: string): void {
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
    res.status(401).json({ errores: [mensaje] });
}

/**
 * Exige una sesión válida. El usuario se vuelve a leer de la BD en cada petición,
 * así un cambio de estatus, vigencia o tipo aplica de inmediato y no hasta que expire el token.
 */
export function requireAuth(repository: UsersRepository): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
        const token: unknown = req.cookies?.[SESSION_COOKIE];
        const id = typeof token === 'string' ? leerToken(token) : null;
        if (!id) return sinSesion(res, 'SESIÓN EXPIRADA, INICIE SESIÓN DE NUEVO');

        try {
            const usuario = await repository.buscarPorId(id);
            if (!usuario) return sinSesion(res, 'SESIÓN EXPIRADA, INICIE SESIÓN DE NUEVO');

            const motivo = motivoSinAcceso(usuario);
            if (motivo) return sinSesion(res, motivo);

            req.usuario = usuario;
            next();
        } catch (error) {
            console.error('Error al validar la sesión:', error);
            res.status(500).json({ errores: ['NO SE PUDO VALIDAR LA SESIÓN'] });
        }
    };
}

/** Debe ir después de requireAuth. */
export const requireAdmin: RequestHandler = (req, res, next) => {
    if (req.usuario?.tipoUsuario !== 'ADMINISTRADOR') {
        res.status(403).json({ errores: ['NO TIENE PERMISO PARA ESTA ACCIÓN'] });
        return;
    }
    next();
};
