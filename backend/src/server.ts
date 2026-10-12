import 'dotenv/config';
import express, { type Application, type Request, type Response } from 'express';
import { createUsersRepository } from './db';
import { createUsersRouter } from './routes/users';
import { pingErp } from './services/erpApi';

const app: Application = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
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

// CRUD de usuarios del sistema sobre la base de datos propia.
app.use('/api/users', createUsersRouter(createUsersRepository()));

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});