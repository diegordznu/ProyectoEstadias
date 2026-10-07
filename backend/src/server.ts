import 'dotenv/config';
import sql from 'mssql';
import express, { type Application, type Request, type Response } from 'express';
import { requiredEnv } from './config/env';
import { pingErp } from './services/erpApi';

const app: Application = express();
const port = 3000;

const config = {
    user: requiredEnv('DB_USER'),
    password: requiredEnv('DB_PASSWORD'),
    server: requiredEnv('DB_SERVER'),
    database: requiredEnv('DB_NAME'),
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.get('/', (_req: Request, res: Response) => {
    res.send('Hello, Typescript with Express and SQL Server!');
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

async function startServer(): Promise<void> {
    try {
        ///await sql.connect(config);
        console.log('Conectado a la base de datos.');
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    } catch (error: unknown) {
        console.error('Error al conectar a la base de datos:', error);
        process.exitCode = 1;
    }
}

void startServer();