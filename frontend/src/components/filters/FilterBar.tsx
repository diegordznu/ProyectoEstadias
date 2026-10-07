import { DateRangeFilter, type DateRangeFilterProps } from './DateRangeFilter'
import { MaterialFilter, type MaterialFilterProps } from './MaterialFilter'

export type FilterBarProps = {
  /** Registros totales de la tabla antes de filtrar. */
  total: number
  /** Registros que se muestran después de filtrar. */
  shown: number
  isActive: boolean
  materials: MaterialFilterProps
  /** Omitir el filtro de tiempo en tablas sin columna de fecha. */
  date?: DateRangeFilterProps
  onReset: () => void
}

export function FilterBar({ total, shown, isActive, materials, date, onReset }: FilterBarProps) {
  return (
    <div className="filter-bar">
      {date && <DateRangeFilter {...date} />}

      <MaterialFilter {...materials} />

      <div className="filter-summary">
        <span className="filter-count">
          {shown} DE {total} REGISTROS
        </span>
        <button
          type="button"
          className="btn-red compact filter-reset"
          onClick={onReset}
          disabled={!isActive}
        >
          LIMPIAR
        </button>
      </div>
    </div>
  )
}
