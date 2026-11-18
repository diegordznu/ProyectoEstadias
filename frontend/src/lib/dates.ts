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

/**
 * Fecha ISO de hace N días. Con `time` ('HH:mm') devuelve 'YYYY-MM-DD HH:mm',
 * el formato con hora que usan las tablas de movimientos.
 */
export function daysAgo(days: number, time?: string, base: Date = new Date()): string {
  return withTime(formatDateISO(addDays(base, -days)), time)
}

export function monthsAgo(months: number, time?: string, base: Date = new Date()): string {
  return withTime(formatDateISO(addMonths(base, -months)), time)
}

function withTime(date: string, time?: string): string {
  return time ? `${date} ${time}` : date
}

/** Parte de fecha ('YYYY-MM-DD') de un valor que puede incluir hora. */
export function datePart(value: string): string {
  return value.slice(0, 10)
}

/**
 * Convierte el preset activo (o el rango personalizado) a un rango ISO.
 * Devuelve un objeto vacío cuando no hay filtro de tiempo.
 */
export function resolvePreset(preset: DatePreset, custom: DateRangeValue = {}): ResolvedRange {
  if (preset === 'custom') {
    return { from: custom.from && formatDateISO(custom.from), to: custom.to && formatDateISO(custom.to) }
  }
  if (preset === 'all') return {}

  const today = new Date()
  return { from: PRESET_FROM[preset](today), to: formatDateISO(today) }
}

const PRESET_FROM: Record<Exclude<DatePreset, 'all' | 'custom'>, (today: Date) => string> = {
  today: (today) => formatDateISO(today),
  d7: (today) => daysAgo(7, undefined, today),
  d15: (today) => daysAgo(15, undefined, today),
  d30: (today) => daysAgo(30, undefined, today),
  m3: (today) => monthsAgo(3, undefined, today),
  m6: (today) => monthsAgo(6, undefined, today),
}

export function rangeLabel(range: ResolvedRange): string | null {
  if (range.from && range.to) return `DEL ${range.from} AL ${range.to}`
  if (range.from) return `DESDE ${range.from}`
  if (range.to) return `HASTA ${range.to}`
  return null
}
