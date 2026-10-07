import { useEffect, useRef, useState } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { es } from 'react-day-picker/locale/es'
import {
  DATE_PRESETS,
  rangeLabel,
  type DatePreset,
  type DateRangeValue,
  type ResolvedRange,
} from '../../lib/dates'

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
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleOutside = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [open])

  const selected: DateRange = { from: customRange.from, to: customRange.to }
  const label = rangeLabel(range)

  const handleSelect = (next: DateRange | undefined) => {
    onCustomRangeChange({ from: next?.from, to: next?.to })
    onPresetChange('custom')
    if (next?.from && next?.to) setOpen(false)
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
              setOpen(false)
            }}
          >
            {item.label}
          </button>
        ))}

        <button
          type="button"
          className={preset === 'custom' ? 'preset-btn active' : 'preset-btn'}
          onClick={() => setOpen((value) => !value)}
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
            onSelect={handleSelect}
            showOutsideDays
            captionLayout="dropdown-months"
          />
          <button type="button" className="btn-gray compact inline-action" onClick={() => setOpen(false)}>
            CERRAR
          </button>
        </div>
      )}
    </div>
  )
}
