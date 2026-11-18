import { Router, type Request, type Response } from 'express';
import { MovimientoRechazado, type InventarioRepository } from '../db/inventarioRepository';
import { validarMovimiento, type MovimientoPayload } from '../validation/movimientos';
import { soloTexto } from '../validation/users';
import { requireRoles } from '../auth/middleware';

function cuerpo(req: Request): MovimientoPayload {
    const body = req.body;
    return body && typeof body === 'object' ? (body as MovimientoPayload) : {};
}

/** Responde 500 con un mensaje para el usuario y deja el detalle en el log. */
function errorInterno(res: Response, mensaje: string, error: unknown): void {
    console.error(`${mensaje}:`, error);
    res.status(500).json({ errores: [mensaje] });
}

/**
 * Inventario y movimientos entre plantas (requiere sesión, ver server.ts).
 * - Consultar: cualquier tipo de usuario.
 * - Registrar movimientos: ADMINISTRADOR y CAPTURISTA.
 */
export function createInventarioRouter(repository: InventarioRepository): Router {
    const router = Router();

    router.get('/', async (_req: Request, res: Response) => {
        try {
            res.json(await repository.inventario());
        } catch (error) {
            errorInterno(res, 'NO SE PUDO OBTENER EL INVENTARIO', error);
        }
    });

    router.get('/materiales', async (_req: Request, res: Response) => {
        try {
            res.json(await repository.listarMateriales());
        } catch (error) {
            errorInterno(res, 'NO SE PUDO OBTENER LA LISTA DE MATERIALES', error);
        }
    });

    router.get('/ubicaciones', async (_req: Request, res: Response) => {
        try {
            res.json(await repository.listarUbicaciones());
        } catch (error) {
            errorInterno(res, 'NO SE PUDO OBTENER LA LISTA DE UBICACIONES', error);
        }
    });

    // ?planta=Planta 1 → solo los movimientos donde esa planta es origen o destino.
    router.get('/movimientos', async (req: Request, res: Response) => {
        const planta = soloTexto(req.query.planta) || undefined;
        try {
            res.json(await repository.listarMovimientos(planta));
        } catch (error) {
            errorInterno(res, 'NO SE PUDIERON OBTENER LOS MOVIMIENTOS', error);
        }
    });

    router.post('/movimientos', requireRoles('ADMINISTRADOR', 'CAPTURISTA'), async (req: Request, res: Response) => {
        const resultado = validarMovimiento(cuerpo(req));
        if (!resultado.ok) {
            res.status(400).json({ errores: resultado.errores });
            return;
        }

        try {
            const movimiento = await repository.registrarMovimiento(resultado.value, req.usuario?.id ?? null);
            res.status(201).json(movimiento);
        } catch (error) {
            if (error instanceof MovimientoRechazado) {
                res.status(error.status).json({ errores: [error.message] });
                return;
            }
            errorInterno(res, 'NO SE PUDO REGISTRAR EL MOVIMIENTO', error);
        }
    });

    return router;
}
