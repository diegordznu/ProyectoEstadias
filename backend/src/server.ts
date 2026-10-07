import 'dotenv/config';
import express, { type Application, type Request, type Response } from 'express';
import { pingErp } from './services/erpApi';

const app: Application = express();
const port = 3000;

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

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});