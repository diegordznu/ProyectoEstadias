import type { useTableFilters } from '../../hooks/useTableFilters'
import { DateRangeFilter } from './DateRangeFilter'
import { MaterialFilter } from './MaterialFilter'

export type FilterBarProps = {
  filters: ReturnType<typeof useTableFilters<unknown>>
  /** Omitir en tablas sin columna de fecha. */
  withDate?: boolean
}

export function FilterBar({ filters, withDate = false }: FilterBarProps) {
  return (
    <div className="filter-bar">
      {withDate && (
        <DateRangeFilter
          preset={filters.preset}
          customRange={filters.customRange}
          range={filters.range}
          onPresetChange={filters.setPreset}
          onCustomRangeChange={filters.setCustomRange}
        />
      )}

      <MaterialFilter options={filters.options} value={filters.materials} onChange={filters.setMaterials} />

      <div className="filter-summary">
        <span className="filter-count">
          {filters.filtered.length} DE {filters.total} REGISTROS
        </span>
        <button
          type="button"
          className="btn-red compact filter-reset"
          onClick={filters.reset}
          disabled={!filters.isActive}
        >
          LIMPIAR
        </button>
      </div>
    </div>
  )
}
