import bcrypt from 'bcryptjs';
import { Router, type Request, type Response } from 'express';
import type { UsersRepository } from '../db/usersRepository';
import { validarUsuario, type UsuarioPayload } from '../validation/users';

const ROUNDS = 10;

function cuerpo(req: Request): UsuarioPayload {
    const body = req.body;
    return body && typeof body === 'object' ? (body as UsuarioPayload) : {};
}

function responderError(res: Response, errores: string[]): void {
    res.status(400).json({ errores });
}

/** Router con el CRUD de usuarios del sistema (alta, consulta, modificación y baja). */
export function createUsersRouter(repository: UsersRepository): Router {
    const router = Router();

    router.get('/', async (_req: Request, res: Response) => {
        try {
            // Nunca se regresa el hash de la contraseña.
            res.json(await repository.listar());
        } catch (error) {
            console.error('Error al consultar usuarios:', error);
            res.status(500).json({ errores: ['NO SE PUDO OBTENER LA LISTA DE USUARIOS'] });
        }
    });

    router.post('/', async (req: Request, res: Response) => {
        const resultado = validarUsuario(cuerpo(req), { requierePassword: true });
        if (!resultado.ok) return responderError(res, resultado.errores);

        const { password, ...valores } = resultado.value;
        if (!password) return responderError(res, ['LA CONTRASEÑA ES OBLIGATORIA']);

        try {
            if (await repository.existeUsuario(valores.usuario)) {
                return res.status(409).json({ errores: ['EL USUARIO YA EXISTE'] });
            }

            const passwordHash = await bcrypt.hash(password, ROUNDS);
            const usuario = await repository.crear({ ...valores, passwordHash });
            res.status(201).json(usuario);
        } catch (error) {
            console.error('Error al crear usuario:', error);
            res.status(500).json({ errores: ['NO SE PUDO GUARDAR EL USUARIO'] });
        }
    });

    router.put('/:id', async (req: Request, res: Response) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ errores: ['EL IDENTIFICADOR NO ES VÁLIDO'] });
        }

        const resultado = validarUsuario(cuerpo(req), { requierePassword: false });
        if (!resultado.ok) return responderError(res, resultado.errores);

        const { password, ...valores } = resultado.value;

        try {
            if (await repository.existeUsuario(valores.usuario, id)) {
                return res.status(409).json({ errores: ['EL USUARIO YA EXISTE'] });
            }

            const passwordHash = password ? await bcrypt.hash(password, ROUNDS) : null;
            const usuario = await repository.modificar(id, { ...valores, passwordHash });

            if (!usuario) {
                return res.status(404).json({ errores: ['EL USUARIO NO EXISTE'] });
            }

            res.json(usuario);
        } catch (error) {
            console.error('Error al modificar usuario:', error);
            res.status(500).json({ errores: ['NO SE PUDO MODIFICAR EL USUARIO'] });
        }
    });

    router.delete('/:id', async (req: Request, res: Response) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ errores: ['EL IDENTIFICADOR NO ES VÁLIDO'] });
        }

        try {
            const eliminado = await repository.eliminar(id);
            if (!eliminado) {
                return res.status(404).json({ errores: ['EL USUARIO NO EXISTE'] });
            }
            res.status(204).end();
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            res.status(500).json({ errores: ['NO SE PUDO ELIMINAR EL USUARIO'] });
        }
    });

    return router;
}
