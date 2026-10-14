import { ApiError, apiRequest } from './client'
import type { Usuario } from '../types/user'

export function login(usuario: string, password: string): Promise<Usuario> {
  return apiRequest<Usuario>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ usuario, password }),
  })
}

export async function logout(): Promise<void> {
  await apiRequest<void>('/auth/logout', { method: 'POST' })
}

/** Sesión activa (la cookie la manda el navegador), o null si no hay. */
export async function fetchSession(): Promise<Usuario | null> {
  try {
    return await apiRequest<Usuario>('/auth/me')
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}
