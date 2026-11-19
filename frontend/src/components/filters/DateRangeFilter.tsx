import { useState } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { es } from 'react-day-picker/locale/es'
import {
  DATE_PRESETS,
  formatDateISO,
  rangeLabel,
  type DatePreset,
  type DateRangeValue,
  type ResolvedRange,
} from '../../lib/dates'
import { useClickOutside } from '../../hooks/useClickOutside'

export type DateRangeFilterProps = {
  preset: DatePreset
  customRange: DateRangeValue
  range: ResolvedRange
  onPresetChange: (preset: DatePreset) => void
  onCustomRangeChange: (range: DateRangeValue) => void
}

export function DateRangeFilter({
  preset,
  customRange,
  range,
  onPresetChange,
  onCustomRangeChange,
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false)
  /** Primer día elegido desde que se abrió el calendario: el segundo clic forma el rango. */
  const [inicio, setInicio] = useState<Date | null>(null)

  const cambiarAbierto = (valor: boolean) => {
    setOpen(valor)
    setInicio(null)
  }
  const rootRef = useClickOutside(open, cambiarAbierto)

  const selected: DateRange = { from: customRange.from, to: customRange.to }
  const label = rangeLabel(range)

  // Primer clic: filtra ese día y deja el calendario abierto (CERRAR o clic afuera lo conservan).
  // Segundo clic: forma el rango entre ambos días, en cualquier orden, y cierra.
  const handleDayClick = (dia: Date) => {
    onPresetChange('custom')

    if (!inicio) {
      onCustomRangeChange({ from: dia, to: dia })
      setInicio(dia)
      return
    }

    const [desde, hasta] = inicio <= dia ? [inicio, dia] : [dia, inicio]
    onCustomRangeChange({ from: desde, to: hasta })
    cambiarAbierto(false)
  }

  return (
    <div className="filter-block" ref={rootRef}>
      <span className="filter-label">POR TIEMPO</span>

      <div className="preset-group">
        {DATE_PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={preset === item.id ? 'preset-btn active' : 'preset-btn'}
            onClick={() => {
              onPresetChange(item.id)
              cambiarAbierto(false)
            }}
          >
            {item.label}
          </button>
        ))}

        <button
          type="button"
          className={preset === 'custom' ? 'preset-btn active' : 'preset-btn'}
          onClick={() => cambiarAbierto(!open)}
          aria-expanded={open}
        >
          CALENDARIO
        </button>
      </div>

      {label && <span className="filter-range">{label}</span>}

      {open && (
        <div className="calendar-popover">
          <DayPicker
            mode="range"
            locale={es}
            selected={selected}
            onSelect={(_seleccion, dia) => handleDayClick(dia)}
            showOutsideDays
            captionLayout="dropdown-months"
          />
          <span className="calendar-hint">
            {inicio
              ? `DÍA ${formatDateISO(inicio)}. ELIJA OTRO DÍA PARA UN RANGO O CIERRE.`
              : 'ELIJA UN DÍA, O DOS PARA UN RANGO.'}
          </span>
          <button type="button" className="btn-gray compact inline-action" onClick={() => cambiarAbierto(false)}>
            CERRAR
          </button>
        </div>
      )}
    </div>
  )
}
