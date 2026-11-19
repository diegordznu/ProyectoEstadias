import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/

// Nombre de esta máquina (Windows lo publica en COMPUTERNAME).
const hostname = process.env.COMPUTERNAME ?? 'localhost'

/**
 * Certificado para servir por HTTPS en la red local (ver docs, "Uso en red local").
 * DEV_HTTPS_CERT y DEV_HTTPS_KEY son rutas a archivos PEM, p. ej. generados con mkcert;
 * se leen del entorno o de frontend/.env.local.
 */
function certificadoLocal(mode: string) {
  const env = loadEnv(mode, process.cwd(), 'DEV_HTTPS_')
  const cert = env.DEV_HTTPS_CERT?.trim()
  const key = env.DEV_HTTPS_KEY?.trim()
  if (!cert || !key) return undefined
  return { cert: readFileSync(resolve(cert)), key: readFileSync(resolve(key)) }
}

export default defineConfig(({ mode }) => {
  const https = certificadoLocal(mode)

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] })
    ],
    server: {
      https,
      // Solo con HTTPS se escucha en todas las interfaces: desde otra computadora de la
      // misma red se entra por https://<IP>:5173 o https://<hostname>:5173. Sin certificado
      // queda solo en esta máquina, para que la contraseña y la cookie de sesión nunca
      // viajen sin cifrar por la red (el backend además rechaza HTTP que no sea local).
      host: https ? true : 'localhost',
      // Vite rechaza por defecto cualquier Host que no sea localhost. Aquí se
      // acepta el nombre de esta máquina y los *.local; las IPs (192.168.x.x)
      // ya se aceptan sin declararlas.
      allowedHosts: [hostname, hostname.toLowerCase(), '.local'],
      proxy: {
        // El backend (Express, puerto 3000, solo loopback) queda detrás de /api para evitar CORS.
        // xfwd inyecta X-Forwarded-For/Port/Proto para que Express conozca la IP
        // real del cliente y si la conexión original fue HTTPS.
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
          xfwd: true,
        },
      },
    },
  }
})
