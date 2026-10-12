export type UsuarioTipo = 'ADMINISTRADOR' | 'CAPTURISTA' | 'CONSULTA'

export type UsuarioEstatus = 'ACTIVO' | 'INACTIVO'

export type Usuario = {
  id: number
  usuario: string
  tipoUsuario: UsuarioTipo
  /** Fecha ISO 'YYYY-MM-DD' o null cuando no está definida. */
  vigenciaFini: string | null
  /** Fecha ISO 'YYYY-MM-DD' o null cuando no está definida. */
  vigenciaFechafin: string | null
  estatus: UsuarioEstatus
}

/** Datos que envía la pantalla al dar de alta o modificar un usuario. */
export type UsuarioPayload = {
  usuario: string
  /** Vacío/null en una modificación = conservar la contraseña actual. */
  password: string | null
  tipoUsuario: UsuarioTipo
  vigenciaFini: string | null
  vigenciaFechafin: string | null
  estatus: UsuarioEstatus
}

export const TIPO_USUARIO_OPCIONES: UsuarioTipo[] = ['ADMINISTRADOR', 'CAPTURISTA', 'CONSULTA']

export const ESTATUS_OPCIONES: UsuarioEstatus[] = ['ACTIVO', 'INACTIVO']

/** 'YYYY-MM-DD' -> 'DD/MM/YYYY' (devuelve '' cuando no hay fecha). */
export function formatFecha(fecha: string | null): string {
  if (!fecha) return ''
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}
