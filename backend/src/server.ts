import 'dotenv/config';
import sql from 'mssql';
import express, { type Application, type Request, type Response } from 'express';

const app: Application = express();
const port = 3000;

function requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value?.trim()) {
        throw new Error(`Falta configurar la variable ${name} en el archivo .env`);
    }
    return value;
}
/*
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
*/
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.get('/', (_req: Request, res: Response) => {
    res.send('Hello, Typescript with Express and SQL Server!');
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
