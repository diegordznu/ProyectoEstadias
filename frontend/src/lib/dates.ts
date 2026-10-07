import { addDays, addMonths, format } from 'date-fns'

/** Formato de las fechas usadas en las tablas: 'YYYY-MM-DD'. */
export const DATE_FORMAT = 'yyyy-MM-dd'

export type DatePreset = 'all' | 'today' | 'd7' | 'd15' | 'd30' | 'm3' | 'm6' | 'custom'

export type DateRangeValue = { from?: Date; to?: Date }

/** Rango ya convertido al mismo formato ISO que usan las tablas. */
export type ResolvedRange = { from?: string; to?: string }

export const DATE_PRESETS: ReadonlyArray<{ id: Exclude<DatePreset, 'custom'>; label: string }> = [
  { id: 'all', label: 'TODOS' },
  { id: 'today', label: 'HOY' },
  { id: 'd7', label: '7 DÍAS' },
  { id: 'd15', label: '15 DÍAS' },
  { id: 'd30', label: '30 DÍAS' },
  { id: 'm3', label: '3 MESES' },
  { id: 'm6', label: '6 MESES' },
]

export function formatDateISO(date: Date): string {
  return format(date, DATE_FORMAT)
}

export function daysAgo(days: number, base: Date = new Date()): string {
  return formatDateISO(addDays(base, -days))
}

export function monthsAgo(months: number, base: Date = new Date()): string {
  return formatDateISO(addMonths(base, -months))
}

/**
 * Convierte el preset activo (o el rango personalizado) a un rango ISO.
 * Devuelve un objeto vacío cuando no hay filtro de tiempo.
 */
export function resolvePreset(preset: DatePreset, custom: DateRangeValue = {}): ResolvedRange {
  if (preset === 'custom') {
    return {
      from: custom.from ? formatDateISO(custom.from) : undefined,
      to: custom.to ? formatDateISO(custom.to) : undefined,
    }
  }

  if (preset === 'all') return {}

  const today = new Date()
  const to = formatDateISO(today)

  switch (preset) {
    case 'today':
      return { from: to, to }
    case 'd7':
      return { from: daysAgo(7, today), to }
    case 'd15':
      return { from: daysAgo(15, today), to }
    case 'd30':
      return { from: daysAgo(30, today), to }
    case 'm3':
      return { from: monthsAgo(3, today), to }
    case 'm6':
      return { from: monthsAgo(6, today), to }
    default:
      return {}
  }
}

export function rangeLabel(range: ResolvedRange): string | null {
  if (range.from && range.to) return `DEL ${range.from} AL ${range.to}`
  if (range.from) return `DESDE ${range.from}`
  if (range.to) return `HASTA ${range.to}`
  return null
}
