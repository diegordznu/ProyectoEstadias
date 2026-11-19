import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Usuario, UsuarioTipo, UsersRepository } from '../db/usersRepository';
import { SESSION_COOKIE, clienteLocal, conexionSegura, leerToken, motivoSinAcceso, opcionesCookie } from './session';

declare global {
    namespace Express {
        interface Request {
            /** Usuario de la sesión, disponible después de requireAuth. */
            usuario?: Usuario;
            /** Versión de sesión del token, disponible después de requireAuth. */
            sesionVersion?: number;
        }
    }
}

function sinSesion(req: Request, res: Response, mensaje: string): void {
    res.clearCookie(SESSION_COOKIE, opcionesCookie(req));
    res.status(401).json({ errores: [mensaje] });
}

/**
 * Rechaza la API por HTTP sin cifrar salvo desde esta misma máquina: en la red local
 * la contraseña y la cookie de sesión viajarían en texto plano.
 */
export const requireHttps: RequestHandler = (req, res, next) => {
    if (conexionSegura(req) || clienteLocal(req)) return next();
    res.status(403).json({ errores: ['CONEXIÓN NO SEGURA: ENTRE AL SISTEMA CON HTTPS'] });
};

/**
 * Exige una sesión válida. El usuario se vuelve a leer de la BD en cada petición,
 * así un cambio de estatus, vigencia o tipo aplica de inmediato y no hasta que expire el token.
 * El token también se rechaza si su versión ya no es la vigente (cerró sesión o cambió la contraseña).
 */
export function requireAuth(repository: UsersRepository): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
        const cookie: unknown = req.cookies?.[SESSION_COOKIE];
        const token = typeof cookie === 'string' ? leerToken(cookie) : null;
        if (!token) return sinSesion(req, res, 'SESIÓN EXPIRADA, INICIE SESIÓN DE NUEVO');

        try {
            const sesion = await repository.buscarSesion(token.id);
            if (!sesion || sesion.sesionVersion !== token.version) {
                return sinSesion(req, res, 'SESIÓN EXPIRADA, INICIE SESIÓN DE NUEVO');
            }

            const motivo = motivoSinAcceso(sesion.usuario);
            if (motivo) return sinSesion(req, res, motivo);

            req.usuario = sesion.usuario;
            req.sesionVersion = sesion.sesionVersion;
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

/** Debe ir después de requireAuth. Permite el paso solo a los tipos de usuario indicados. */
export function requireRoles(...tipos: UsuarioTipo[]): RequestHandler {
    return (req, res, next) => {
        if (!req.usuario || !tipos.includes(req.usuario.tipoUsuario)) {
            res.status(403).json({ errores: ['NO TIENE PERMISO PARA ESTA ACCIÓN'] });
            return;
        }
        next();
    };
}
