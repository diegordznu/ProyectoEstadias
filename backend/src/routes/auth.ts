import bcrypt from 'bcryptjs';
import { Router, type Request, type Response } from 'express';
import { limpiarFallos, registrarFallo, tiempoBloqueado } from '../auth/loginAttempts';
import { requireAuth } from '../auth/middleware';
import { SESSION_COOKIE, crearToken, leerToken, motivoSinAcceso, opcionesCookie } from '../auth/session';
import type { UsersRepository } from '../db/usersRepository';
import { soloTexto } from '../validation/users';

const CREDENCIALES_INCORRECTAS = 'USUARIO O CONTRASEÑA INCORRECTOS';

/**
 * Hash de una contraseña cualquiera: si el usuario no existe se compara contra él,
 * para que la respuesta tarde lo mismo y no delate qué usuarios existen.
 */
const HASH_FALSO = bcrypt.hashSync('usuario-inexistente', 10);

/** Router de sesión: login, logout y consulta del usuario actual. */
export function createAuthRouter(repository: UsersRepository): Router {
    const router = Router();

    router.post('/login', async (req: Request, res: Response) => {
        const body = (req.body ?? {}) as { usuario?: unknown; password?: unknown };
        const usuario = soloTexto(body.usuario).toUpperCase();
        const password = soloTexto(body.password);

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

            const { passwordHash: _passwordHash, sesionVersion, ...sesion } = encontrado;

            // La contraseña era correcta: aquí sí se puede decir por qué no entra.
            const motivo = motivoSinAcceso(sesion);
            if (motivo) return res.status(403).json({ errores: [motivo] });

            const { token, maxAge } = crearToken(sesion, sesionVersion);
            res.cookie(SESSION_COOKIE, token, { ...opcionesCookie(req), maxAge });
            res.json(sesion);
        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            res.status(500).json({ errores: ['NO SE PUDO INICIAR SESIÓN'] });
        }
    });

    // Además de borrar la cookie, revoca el token en el servidor: una copia robada deja de servir.
    // Se cierran todas las sesiones del usuario (también las de otros equipos).
    router.post('/logout', async (req: Request, res: Response) => {
        res.clearCookie(SESSION_COOKIE, opcionesCookie(req));

        const cookie: unknown = req.cookies?.[SESSION_COOKIE];
        const token = typeof cookie === 'string' ? leerToken(cookie) : null;
        if (!token) return res.status(204).end();

        try {
            await repository.cerrarSesiones(token.id, token.version);
            res.status(204).end();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            res.status(500).json({ errores: ['NO SE PUDO CERRAR LA SESIÓN EN EL SERVIDOR'] });
        }
    });

    // Permite al frontend recuperar la sesión al recargar la página.
    router.get('/me', requireAuth(repository), (req: Request, res: Response) => {
        res.json(req.usuario);
    });

    return router;
}
