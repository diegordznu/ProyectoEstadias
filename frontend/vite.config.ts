import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/

// Nombre de esta máquina (Windows lo publica en COMPUTERNAME).
const hostname = process.env.COMPUTERNAME ?? 'localhost'

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    // Escuchar en todas las interfaces: desde otra computadora de la misma red
    // se entra por http://<IP>:5173 o http://<hostname>:5173.
    host: true,
    // Vite rechaza por defecto cualquier Host que no sea localhost. Aquí se
    // acepta el nombre de esta máquina y los *.local; las IPs (192.168.x.x)
    // ya se aceptan sin declararlas.
    allowedHosts: [hostname, hostname.toLowerCase(), '.local'],
    proxy: {
      // El backend (Express, puerto 3000) queda detrás de /api para evitar CORS.
      // xfwd inyecta X-Forwarded-For/Port/Proto para que Express conozca la IP
      // real del cliente y no la del propio proxy (127.0.0.1).
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        xfwd: true,
      },
    },
  },
})