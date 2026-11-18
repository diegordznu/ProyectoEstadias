import type { useTableFilters } from '../../hooks/useTableFilters'
import { DateRangeFilter } from './DateRangeFilter'
import { MaterialFilter } from './MaterialFilter'

export type FilterBarProps = {
  filters: ReturnType<typeof useTableFilters<unknown>>
  /** Omitir en tablas sin columna de fecha. */
  withDate?: boolean
  /** Mostrar los interruptores SOLO ORIGEN / SOLO DESTINO (tablas con esas columnas). */
  withRoute?: boolean
}

type FilterSwitchProps = {
  label: string
  text: string
  active: boolean
  onToggle: () => void
}

/** Interruptor de dos estados (apagado/encendido) con el estilo de los presets de tiempo. */
function FilterSwitch({ label, text, active, onToggle }: FilterSwitchProps) {
  return (
    <div className="filter-block">
      <span className="filter-label">{label}</span>
      <div className="preset-group">
        <button
          type="button"
          className={active ? 'preset-btn active' : 'preset-btn'}
          aria-pressed={active}
          onClick={onToggle}
        >
          {text}
        </button>
      </div>
    </div>
  )
}

export function FilterBar({ filters, withDate = false, withRoute = false }: FilterBarProps) {
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

      {withRoute && (
        <>
          <FilterSwitch
            label="POR ORIGEN"
            text="SOLO ORIGEN"
            active={filters.soloOrigen}
            onToggle={() => filters.setSoloOrigen(!filters.soloOrigen)}
          />
          <FilterSwitch
            label="POR DESTINO"
            text="SOLO DESTINO"
            active={filters.soloDestino}
            onToggle={() => filters.setSoloDestino(!filters.soloDestino)}
          />
        </>
      )}

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
