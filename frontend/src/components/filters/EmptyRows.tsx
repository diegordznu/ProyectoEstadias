export type EmptyRowsProps = {
  colSpan: number
  /** true cuando los filtros activos descartaron todas las filas. */
  filtered: boolean
  defaultLabel: string
  onReset: () => void
}

export function EmptyRows({ colSpan, filtered, defaultLabel, onReset }: EmptyRowsProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="empty-cell">
        {filtered ? (
          <span className="empty-filtered">
            SIN RESULTADOS PARA LOS FILTROS SELECCIONADOS
            <button type="button" className="btn-blue compact inline-action" onClick={onReset}>
              LIMPIAR FILTROS
            </button>
          </span>
        ) : (
          defaultLabel
        )}
      </td>
    </tr>
  )
}

export type StatusRowProps = {
  colSpan: number
  children: string
}

/** Fila única para avisos de la tabla: cargando o error al consultar la API. */
export function StatusRow({ colSpan, children }: StatusRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="empty-cell" role="status">
        {children}
      </td>
    </tr>
  )
}
