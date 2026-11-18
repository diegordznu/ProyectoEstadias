// Servidor para desarrollo local y red interna. En Vercel no se usa: allá la app
// se exporta como función serverless desde api/index.ts (raíz del repo).
// dotenv debe ir primero: app.ts valida las variables de entorno al importarse.
import 'dotenv/config';
import os from 'node:os';
import app from './app';

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

const port = Number(process.env.PORT ?? 3000);

// '0.0.0.0' explícito: sin hostname, Node escucha en todas las interfaces por
// accidente; con esto es una decisión y el comportamiento queda documentado.
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port}`);
    for (const ip of direccionesDeRed()) {
        console.log(`  Red local: http://${ip}:${port}`);
    }
});
