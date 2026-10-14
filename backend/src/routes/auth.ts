import bcrypt from 'bcryptjs';
import { Router, type Request, type Response } from 'express';
import { limpiarFallos, registrarFallo, tiempoBloqueado } from '../auth/loginAttempts';
import { requireAuth } from '../auth/middleware';
import { SESSION_COOKIE, crearToken, motivoSinAcceso, sessionCookieOptions } from '../auth/session';
import type { UsersRepository } from '../db/usersRepository';

const CREDENCIALES_INCORRECTAS = 'USUARIO O CONTRASEÑA INCORRECTOS';

/**
 * Hash de una contraseña cualquiera: si el usuario no existe se compara contra él,
 * para que la respuesta tarde lo mismo y no delate qué usuarios existen.
 */
const HASH_FALSO = bcrypt.hashSync('usuario-inexistente', 10);

const texto = (valor: unknown): string => (typeof valor === 'string' ? valor.trim() : '');

/** Router de sesión: login, logout y consulta del usuario actual. */
export function createAuthRouter(repository: UsersRepository): Router {
    const router = Router();

    router.post('/login', async (req: Request, res: Response) => {
        const body = (req.body ?? {}) as { usuario?: unknown; password?: unknown };
        const usuario = texto(body.usuario).toUpperCase();
        const password = texto(body.password);

        if (!usuario || !password) {
            return res.status(400).json({ errores: ['INGRESE USUARIO Y CONTRASEÑA'] });
        }

        const ip = req.ip ?? '';
        const restante = tiempoBloqueado(usuario, ip);
        if (restante > 0) {
            const minutos = Math.ceil(restante / 60_000);
            return res.status(429).json({
                errores: [`DEMASIADOS INTENTOS FALLIDOS. ESPERE ${minutos} MIN`],
            });
        }

        try {
            const encontrado = await repository.buscarPorUsuario(usuario);
            const coincide = await bcrypt.compare(password, encontrado?.passwordHash ?? HASH_FALSO);

            if (!encontrado || !coincide) {
                registrarFallo(usuario, ip);
                return res.status(401).json({ errores: [CREDENCIALES_INCORRECTAS] });
            }

            limpiarFallos(usuario, ip);

            const { passwordHash: _passwordHash, ...sesion } = encontrado;

            // La contraseña era correcta: aquí sí se puede decir por qué no entra.
            const motivo = motivoSinAcceso(sesion);
            if (motivo) return res.status(403).json({ errores: [motivo] });

            const { token, maxAge } = crearToken(sesion);
            res.cookie(SESSION_COOKIE, token, { ...sessionCookieOptions, maxAge });
            res.json(sesion);
        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            res.status(500).json({ errores: ['NO SE PUDO INICIAR SESIÓN'] });
        }
    });

    router.post('/logout', (_req: Request, res: Response) => {
        res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
        res.status(204).end();
    });

    // Permite al frontend recuperar la sesión al recargar la página.
    router.get('/me', requireAuth(repository), (req: Request, res: Response) => {
        res.json(req.usuario);
    });

    return router;
}
