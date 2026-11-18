import { useCallback, useMemo, useState } from 'react'
import { datePart, resolvePreset, type DatePreset, type DateRangeValue } from '../lib/dates'

export type UseTableFiltersOptions<T> = {
  rows: T[]
  /** Columna que identifica el material de cada fila (SKU, pieza, etc.). */
  materialKey: (row: T) => string
  /** Columna de fecha ISO 'YYYY-MM-DD' (puede incluir ' HH:mm'). Si no existe, no hay filtro de tiempo. */
  dateKey?: (row: T) => string
  /** Columna de origen: al definirla (junto a origenFijo) se habilita el interruptor SOLO ORIGEN. */
  origenKey?: (row: T) => string
  /** Valor que debe tener la columna de origen cuando el interruptor está activo (la planta de la pestaña). */
  origenFijo?: string
  /** Columna de destino: al definirla (junto a destinoFijo) se habilita el interruptor SOLO DESTINO. */
  destinoKey?: (row: T) => string
  /** Valor que debe tener la columna de destino cuando el interruptor está activo (la planta de la pestaña). */
  destinoFijo?: string
}

/**
 * Estado compartido de los filtros de una tabla:
 * - tiempo: presets preestablecidos o rango personalizado con calendario
 * - materiales: multi-selección (null = todos)
 * - soloOrigen: muestra únicamente los registros cuyo origen sea la planta de la pestaña
 * - soloDestino: muestra únicamente los registros cuyo destino sea la planta de la pestaña
 */
export function useTableFilters<T>({
  rows,
  materialKey,
  dateKey,
  origenKey,
  origenFijo,
  destinoKey,
  destinoFijo,
}: UseTableFiltersOptions<T>) {
  const [preset, setPreset] = useState<DatePreset>('all')
  const [customRange, setCustomRange] = useState<DateRangeValue>({})
  // null = sin filtro (todos)
  const [materials, setMaterials] = useState<string[] | null>(null)
  const [soloOrigen, setSoloOrigen] = useState(false)
  const [soloDestino, setSoloDestino] = useState(false)

  const options = useMemo(() => {
    const unique = new Set<string>()
    for (const row of rows) unique.add(materialKey(row))
    return Array.from(unique).sort((a, b) => a.localeCompare(b))
  }, [rows, materialKey])

  const range = resolvePreset(preset, customRange)
  const { from, to } = range

  const filtered = useMemo(() => {
    const materialFilter = materials === null ? null : new Set(materials)

    return rows.filter((row) => {
      if (dateKey && (from || to)) {
        // Se compara solo el día para que la hora no deje fuera registros del último día del rango.
        const value = datePart(dateKey(row))
        if (from && value < from) return false
        if (to && value > to) return false
      }

      if (materialFilter && !materialFilter.has(materialKey(row))) return false

      // Interruptores activos: solo los movimientos cuyo origen/destino sea la planta de la pestaña.
      if (soloOrigen && origenKey && origenFijo && origenKey(row) !== origenFijo) return false
      if (soloDestino && destinoKey && destinoFijo && destinoKey(row) !== destinoFijo) return false

      return true
    })
  }, [rows, dateKey, materialKey, origenKey, origenFijo, destinoKey, destinoFijo, from, to, materials, soloOrigen, soloDestino])

  const isActive =
    Boolean(from || to) || materials !== null || soloOrigen || soloDestino

  const reset = useCallback(() => {
    setPreset('all')
    setCustomRange({})
    setMaterials(null)
    setSoloOrigen(false)
    setSoloDestino(false)
  }, [])

  return {
    preset,
    setPreset,
    customRange,
    setCustomRange,
    range,
    materials,
    setMaterials,
    soloOrigen,
    setSoloOrigen,
    soloDestino,
    setSoloDestino,
    options,
    total: rows.length,
    filtered,
    isActive,
    reset,
  }
}
