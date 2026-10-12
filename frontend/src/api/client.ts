const API_BASE: string = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '')

/** Error devuelto por la API (o de red) con un mensaje listo para mostrar. */
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function parseBody(text: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function errorMessage(data: unknown, status: number): string {
  const errores = (data as { errores?: unknown } | null)?.errores
  if (Array.isArray(errores) && errores.length > 0) return errores.join(' · ')
  if (typeof errores === 'string' && errores) return errores
  return `ERROR DEL SERVIDOR (${status})`
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new ApiError('SIN CONEXIÓN CON EL SERVIDOR', 0)
  }

  const data = parseBody(await response.text())

  if (!response.ok) throw new ApiError(errorMessage(data, response.status), response.status)

  return data as T
}
