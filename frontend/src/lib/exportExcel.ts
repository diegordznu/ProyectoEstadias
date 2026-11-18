export type ExcelColumn<T> = {
  key: keyof T
  label: string
  /** Ancho de la columna en caracteres. */
  width?: number
}

/** Quita caracteres no válidos en nombres de archivo y espacios repetidos. */
const sanitizeFileName = (name: string) =>
  name
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '_')
    .trim()

/**
 * Genera y descarga un .xlsx con las filas recibidas (ya filtradas) y las columnas indicadas.
 * La librería se carga bajo demanda para no inflar el bundle inicial.
 */
export async function exportToExcel<T>({
  rows,
  columns,
  fileName,
  sheetName = 'Datos',
}: {
  rows: T[]
  columns: ExcelColumn<T>[]
  fileName: string
  sheetName?: string
}) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')

  const header = columns.map((column) => ({ value: column.label, fontWeight: 'bold' as const }))
  const body = rows.map((row) =>
    columns.map((column) => {
      const value = row[column.key]
      if (typeof value === 'number') return { value, type: Number }
      return { value: value == null ? '' : String(value), type: String }
    }),
  )

  // Excel limita el nombre de la hoja a 31 caracteres.
  await writeXlsxFile([header, ...body], {
    sheet: sheetName.slice(0, 31),
    stickyRowsCount: 1,
    columns: columns.map((column) => ({ width: column.width ?? Math.max(12, column.label.length + 2) })),
  }).toFile(`${sanitizeFileName(fileName)}.xlsx`)
}
