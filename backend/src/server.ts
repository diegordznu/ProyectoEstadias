import 'dotenv/config';
import cookieParser from 'cookie-parser';
import express, { type Application, type Request, type Response } from 'express';
import os from 'node:os';
import { requireAdmin, requireAuth } from './auth/middleware';
import { requiredEnv } from './config/env';
import { createUsersRepository } from './db';
import { createAuthRouter } from './routes/auth';
import { createUsersRouter } from './routes/users';
import { pingErp } from './services/erpApi';

const app: Application = express();
const port = Number(process.env.PORT ?? 3000);

// Sin el secreto no se pueden firmar sesiones: mejor fallar al arrancar que en el primer login.
requiredEnv('JWT_SECRET');

// El frontend se sirve por el proxy de Vite, que corre en esta misma máquina.
// Confiamos en X-Forwarded-For solo vía loopback: así req.ip (el bloqueo de
// intentos de login) refleja la IP real de la máquina externa, y quien se
// conecte directo al puerto 3000 no puede falsificar ese encabezado.
app.set('trust proxy', 'loopback');

app.use(express.json());
app.use(cookieParser());
app.get('/', (_req: Request, res: Response) => {
    res.send('Hello, Typescript with Express!');
});

// Ruta de prueba: confirma que la API del ERP responde.
app.get('/erp/ping', async (_req: Request, res: Response) => {
    try {
        const erp = await pingErp();
        res.status(erp.ok ? 200 : 502).json({ erpStatus: erp.status, body: erp.body });
    } catch (error: unknown) {
        console.error('Error al consultar la API del ERP:', error);
        res.status(502).json({ error: 'No se pudo conectar con la API del ERP' });
    }
});

const usersRepository = createUsersRepository();

app.use('/api/auth', createAuthRouter(usersRepository));

// CRUD de usuarios del sistema: solo para administradores con sesión iniciada.
app.use('/api/users', requireAuth(usersRepository), requireAdmin, createUsersRouter(usersRepository));

/** IPs no internas de esta máquina, para mostrar la URL que deben usar las demás computadoras. */
function direccionesDeRed(): string[] {
    const direcciones: string[] = [];

    for (const interfaz of Object.values(os.networkInterfaces())) {
        for (const dir of interfaz ?? []) {
            if (dir.internal || dir.family !== 'IPv4') continue;
            direcciones.push(dir.address);
        }
    }

    return direcciones;
}

// '0.0.0.0' explícito: sin hostname, Node escucha en todas las interfaces por
// accidente; con esto es una decisión y el comportamiento queda documentado.
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port}`);
    for (const ip of direccionesDeRed()) {
        console.log(`  Red local: http://${ip}:${port}`);
    }
});