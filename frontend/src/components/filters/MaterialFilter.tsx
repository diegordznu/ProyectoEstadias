import { useEffect, useMemo, useRef, useState } from 'react'

export type MaterialFilterProps = {
  /** Todos los materiales disponibles en la tabla. */
  options: string[]
  /** null = sin filtro (todos). [] = ninguno seleccionado. */
  value: string[] | null
  onChange: (value: string[] | null) => void
  label?: string
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export function MaterialFilter({ options, value, onChange, label = 'MATERIAL' }: MaterialFilterProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
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

  const selected = useMemo(() => new Set(value ?? options), [value, options])

  const visibleOptions = useMemo(() => {
    const term = normalize(search.trim())
    if (!term) return options
    return options.filter((option) => normalize(option).includes(term))
  }, [options, search])

  const toggleOption = (option: string) => {
    const current = value ?? options
    const next = current.includes(option)
      ? current.filter((item) => item !== option)
      : [...current, option]

    onChange(next.length === options.length ? null : next)
  }

  const counter = value === null ? `TODOS (${options.length})` : `${value.length} DE ${options.length}`

  return (
    <div className="filter-block material-dropdown" ref={rootRef}>
      <span className="filter-label">{label}</span>

      <button
        type="button"
        className={open ? 'material-toggle open' : 'material-toggle'}
        onClick={() => {
          setSearch('')
          setOpen((previous) => !previous)
        }}
        aria-expanded={open}
        disabled={options.length === 0}
      >
        {counter}
      </button>

      {open && (
        <div className="material-panel">
          <input
            type="search"
            className="material-search"
            placeholder="BUSCAR MATERIAL"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="material-actions">
            <button type="button" className="btn-gray compact" onClick={() => onChange(null)}>
              TODOS
            </button>
            <button type="button" className="btn-gray compact" onClick={() => onChange([])}>
              NINGUNO
            </button>
          </div>

          <ul className="material-list">
            {visibleOptions.map((option) => (
              <li key={option}>
                <label className="material-option">
                  <input
                    type="checkbox"
                    checked={selected.has(option)}
                    onChange={() => toggleOption(option)}
                  />
                  <span>{option}</span>
                </label>
              </li>
            ))}

            {visibleOptions.length === 0 && <li className="material-empty">SIN COINCIDENCIAS</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
