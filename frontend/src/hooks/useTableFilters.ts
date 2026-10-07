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

  const filtered = useMemo(() => {
    const range = resolvePreset(preset, customRange)
    const materialFilter = materials === null ? null : new Set(materials)

    return rows.filter((row) => {
      if (dateKey && (range.from || range.to)) {
        const value = dateKey(row)
        if (range.from && value < range.from) return false
        if (range.to && value > range.to) return false
      }

      if (materialFilter && !materialFilter.has(materialKey(row))) return false

      return true
    })
  }, [rows, dateKey, materialKey, preset, customRange, materials])

  const range = resolvePreset(preset, customRange)
  const dateActive = Boolean(range.from || range.to)
  const isActive = dateActive || materials !== null

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
