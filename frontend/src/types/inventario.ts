export type TipoUbicacion = 'PLANTA' | 'PROVEEDOR' | 'CONSUMO'

export type Ubicacion = {
  id: number
  nombre: string
  tipo: TipoUbicacion
  activo: boolean
}

/** Movimiento tal como lo devuelve la API (nombres ya resueltos). */
export type Movimiento = {
  id: number
  /** 'YYYY-MM-DD HH:mm' */
  fecha: string
  /** SKU del material. */
  material: string
  lote: string
  /** Planta o proveedor externo. */
  origen: string
  /** Planta o consumo externo. */
  destino: string
  cantidad: number
}

export type InventarioMaterial = {
  sku: string
  nombre: string
  /** Existencia por nombre de planta (origen resta, destino suma). */
  existencias: Record<string, number>
  /** Suma de las existencias de todas las plantas. */
  total: number
}

export type Inventario = {
  /** Plantas en el orden de las columnas. */
  plantas: string[]
  materiales: InventarioMaterial[]
}
