// Servidor para desarrollo local y red interna. En Vercel no se usa: allá la app
// se exporta como función serverless desde api/index.ts (raíz del repo).
// dotenv debe ir primero: app.ts valida las variables de entorno al importarse.
import 'dotenv/config';
import app from './app';

const port = Number(process.env.PORT ?? 3000);

// Solo loopback: las demás computadoras entran por el servidor HTTPS de Vite, que reenvía
// /api a este puerto. Escuchar en la red expondría la API por HTTP sin cifrar.
// HOST permite cambiarlo si algún día se pone otro proxy HTTPS delante.
const host = process.env.HOST?.trim() || '127.0.0.1';

app.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});
