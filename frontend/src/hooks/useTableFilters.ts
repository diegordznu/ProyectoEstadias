import { useCallback, useMemo, useState } from 'react'
import { resolvePreset, type DatePreset, type DateRangeValue } from '../lib/dates'

export type UseTableFiltersOptions<T> = {
  rows: T[]
  /** Columna que identifica el material de cada fila (SKU, pieza, etc.). */
  materialKey: (row: T) => string
  /** Columna de fecha en formato ISO 'YYYY-MM-DD'. Si no existe, no hay filtro de tiempo. */
  dateKey?: (row: T) => string
}

/**
 * Estado compartido de los filtros de una tabla:
 * - tiempo: presets preestablecidos o rango personalizado con calendario
 * - materiales: multi-selección (null = todos)
 */
export function useTableFilters<T>({ rows, materialKey, dateKey }: UseTableFiltersOptions<T>) {
  const [preset, setPreset] = useState<DatePreset>('all')
  const [customRange, setCustomRange] = useState<DateRangeValue>({})
  // null = sin filtro (todos los materiales)
  const [materials, setMaterials] = useState<string[] | null>(null)

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
        const value = dateKey(row)
        if (from && value < from) return false
        if (to && value > to) return false
      }

      if (materialFilter && !materialFilter.has(materialKey(row))) return false

      return true
    })
  }, [rows, dateKey, materialKey, from, to, materials])

  const isActive = Boolean(from || to) || materials !== null

  const reset = useCallback(() => {
    setPreset('all')
    setCustomRange({})
    setMaterials(null)
  }, [])

  return {
    preset,
    setPreset,
    customRange,
    setCustomRange,
    range,
    materials,
    setMaterials,
    options,
    total: rows.length,
    filtered,
    isActive,
    reset,
  }
}
