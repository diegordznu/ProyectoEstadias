// Función serverless de Vercel: todas las rutas /api/* llegan aquí (ver vercel.json)
// y las atiende la misma app de Express que se usa en local (backend/src/app.ts).
// Las variables de entorno se configuran en el panel de Vercel, no con .env.
import app from '../backend/src/app';

export default app;
