import { apiRequest } from './client'
import type { Inventario, Movimiento, Ubicacion } from '../types/inventario'

export function fetchInventario(): Promise<Inventario> {
  return apiRequest<Inventario>('/inventario')
}

export function fetchUbicaciones(): Promise<Ubicacion[]> {
  return apiRequest<Ubicacion[]>('/inventario/ubicaciones')
}

/** Todos los movimientos, o solo los de una planta (como origen o destino). */
export function fetchMovimientos(planta?: string): Promise<Movimiento[]> {
  const query = planta ? `?planta=${encodeURIComponent(planta)}` : ''
  return apiRequest<Movimiento[]>(`/inventario/movimientos${query}`)
}
