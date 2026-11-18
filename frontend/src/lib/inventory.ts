/** Plantas que llevan inventario, en el orden en que se muestran las columnas. */
export const PLANTS = ['Planta 1', 'Planta 2', 'Planta 3', 'Planta 6'] as const

export type Plant = (typeof PLANTS)[number]

export type Material = { sku: string; name: string }

/** Lo mínimo que necesita un movimiento para afectar al inventario. */
export type InventoryMovement = {
  piece: string
  /** Proveedor u origen: si es una planta, la cantidad se le resta. */
  origin: string
  /** Destino: si es una planta, la cantidad se le suma. */
  dest: string
  qty: number
}

export type InventoryItem = Material & {
  /** Existencia por planta. */
  stock: Record<Plant, number>
  /** Suma de las existencias de todas las plantas. */
  total: number
}

const isPlant = (value: string): value is Plant => (PLANTS as readonly string[]).includes(value)

/**
 * Calcula la existencia de cada material en cada planta a partir de los movimientos:
 * - la planta que aparece como ORIGEN pierde la cantidad (se resta)
 * - la planta que aparece como DESTINO recibe la cantidad (se suma)
 * Un proveedor externo como origen no resta en ninguna planta.
 *
 * Ejemplo: MOD-AC-01 sale 20 de Planta 1 y llegan 50 a Planta 1 → Planta 1 = 50 − 20 = 30.
 */
export function computeInventory(materials: Material[], movements: InventoryMovement[]): InventoryItem[] {
  const stockBySku = new Map<string, Record<Plant, number>>()

  const stockFor = (sku: string) => {
    let stock = stockBySku.get(sku)
    if (!stock) {
      stock = Object.fromEntries(PLANTS.map((plant) => [plant, 0])) as Record<Plant, number>
      stockBySku.set(sku, stock)
    }
    return stock
  }

  for (const movement of movements) {
    const stock = stockFor(movement.piece)
    if (isPlant(movement.origin)) stock[movement.origin] -= movement.qty
    if (isPlant(movement.dest)) stock[movement.dest] += movement.qty
  }

  return materials.map((material) => {
    const stock = stockFor(material.sku)
    const total = PLANTS.reduce((sum, plant) => sum + stock[plant], 0)
    return { ...material, stock, total }
  })
}
