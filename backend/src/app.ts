import cookieParser from 'cookie-parser';
import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import { requireAdmin, requireAuth, requireHttps } from './auth/middleware';
import { requiredEnv } from './config/env';
import { createUsersRepository } from './db';
import { InventarioRepository } from './db/inventarioRepository';
import { getPool } from './db/pool';
import { createAuthRouter } from './routes/auth';
import { createInventarioRouter } from './routes/inventario';
import { createUsersRouter } from './routes/users';

/**
 * Aplicación Express sin `listen`: la usan tanto el servidor local (server.ts)
 * como la función serverless de Vercel (api/index.ts en la raíz del repo).
 */

// Sin estas variables no hay sesiones ni datos: mejor fallar al arrancar que en la primera petición.
requiredEnv('JWT_SECRET');
requiredEnv('DATABASE_URL');

const app: Application = express();

// En Vercel la petición llega por su proxy, que reescribe X-Forwarded-For con la IP real del
// cliente. En local el frontend pasa por el proxy de Vite (misma máquina): se confía solo en
// loopback, así quien se conecte directo al puerto 3000 no puede falsificar ese encabezado.
// req.ip se usa para el bloqueo de intentos de login y req.secure (X-Forwarded-Proto) para exigir HTTPS.
app.set('trust proxy', process.env.VERCEL ? true : 'loopback');
app.disable('x-powered-by');

// Antes que todo lo demás: sin HTTPS (fuera de esta máquina) la API no recibe contraseñas ni cookies.
app.use('/api', requireHttps);

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

const usersRepository = createUsersRepository();

app.use('/api/auth', createAuthRouter(usersRepository));

// CRUD de usuarios del sistema: solo para administradores con sesión iniciada.
app.use('/api/users', requireAuth(usersRepository), requireAdmin, createUsersRouter(usersRepository));

// Inventario y movimientos: cualquier usuario con sesión consulta; registrar exige ADMINISTRADOR o CAPTURISTA.
app.use('/api/inventario', requireAuth(usersRepository), createInventarioRouter(new InventarioRepository(getPool())));

// Cualquier otra ruta de la API: JSON en lugar de la página HTML por defecto de Express.
app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ errores: ['RUTA NO ENCONTRADA'] });
});

// Errores no atrapados (JSON mal formado, cuerpo demasiado grande, etc.): nunca se expone el detalle.
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = (error as { status?: unknown })?.status;
    if (typeof status === 'number' && status >= 400 && status < 500) {
        res.status(status).json({ errores: ['SOLICITUD NO VÁLIDA'] });
        return;
    }
    console.error('Error no controlado:', error);
    res.status(500).json({ errores: ['ERROR INTERNO DEL SERVIDOR'] });
});

export default app;
