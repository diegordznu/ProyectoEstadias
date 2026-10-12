import { apiRequest } from './client'
import type { Usuario, UsuarioPayload } from '../types/user'

export function fetchUsers(): Promise<Usuario[]> {
  return apiRequest<Usuario[]>('/users')
}

export function createUser(payload: UsuarioPayload): Promise<Usuario> {
  return apiRequest<Usuario>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateUser(id: number, payload: UsuarioPayload): Promise<Usuario> {
  return apiRequest<Usuario>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteUser(id: number): Promise<void> {
  await apiRequest<void>(`/users/${id}`, { method: 'DELETE' })
}
