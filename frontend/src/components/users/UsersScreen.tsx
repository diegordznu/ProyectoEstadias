import { useCallback, useEffect, useState } from 'react'
import { createUser, deleteUser, fetchUsers, updateUser } from '../../api/users'
import { EmptyRows } from '../filters/EmptyRows'
import {
  ESTATUS_OPCIONES,
  TIPO_USUARIO_OPCIONES,
  formatFecha,
  type Usuario,
  type UsuarioEstatus,
  type UsuarioPayload,
  type UsuarioTipo,
} from '../../types/user'

type UsersScreenProps = {
  onBack: () => void
  onNotify: (text: string, isError?: boolean) => void
}

type FormValues = {
  usuario: string
  password: string
  tipoUsuario: UsuarioTipo
  vigenciaFini: string
  vigenciaFechafin: string
  estatus: UsuarioEstatus
}

type Draft = { mode: 'new' } | { mode: 'edit'; id: number }

type FieldErrors = Partial<Record<keyof FormValues, string>>

const COLSPAN = 8
const PASSWORD_MINIMA = 6
const USUARIO_MINIMO = 3
const USUARIO_MAXIMO = 30

const emptyValues = (): FormValues => ({
  usuario: '',
  password: '',
  tipoUsuario: 'CAPTURISTA',
  vigenciaFini: '',
  vigenciaFechafin: '',
  estatus: 'ACTIVO',
})

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message.toUpperCase() : 'ERROR INESPERADO'

function validate(
  values: FormValues,
  draft: Draft,
  users: Usuario[],
): FieldErrors {
  const errores: FieldErrors = {}
  const usuario = values.usuario.trim().toUpperCase()

  if (!usuario) {
    errores.usuario = 'EL USUARIO ES OBLIGATORIO'
  } else if (usuario.length < USUARIO_MINIMO || usuario.length > USUARIO_MAXIMO) {
    errores.usuario = `DEBE TENER DE ${USUARIO_MINIMO} A ${USUARIO_MAXIMO} CARACTERES`
  } else if (
    users.some((item) => item.usuario === usuario && !(draft.mode === 'edit' && item.id === draft.id))
  ) {
    errores.usuario = 'EL USUARIO YA EXISTE'
  }

  const requierePassword = draft.mode === 'new'
  if (requierePassword && !values.password.trim()) {
    errores.password = 'LA CONTRASEÑA ES OBLIGATORIA'
  } else if (values.password && values.password.length < PASSWORD_MINIMA) {
    errores.password = `MINIMO ${PASSWORD_MINIMA} CARACTERES`
  }

  if (values.vigenciaFini && values.vigenciaFechafin && values.vigenciaFini > values.vigenciaFechafin) {
    errores.vigenciaFechafin = 'DEBE SER MAYOR O IGUAL A LA INICIAL'
  }

  return errores
}

export function UsersScreen({ onBack, onNotify }: UsersScreenProps) {
  const [users, setUsers] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [draft, setDraft] = useState<Draft | null>(null)
  const [values, setValues] = useState<FormValues>(emptyValues)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const load = useCallback(() => {
    fetchUsers()
      .then((data) => {
        setUsers(data)
        setLoadError(null)
      })
      .catch((error: unknown) => {
        setLoadError(messageOf(error))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const reload = () => {
    setLoading(true)
    setLoadError(null)
    load()
  }

  const openDraft = (next: Draft | null, formValues = emptyValues()) => {
    setValues(formValues)
    setFieldErrors({})
    setShowPassword(false)
    setDraft(next)
  }

  const closeDraft = () => openDraft(null)
  const startNew = () => openDraft({ mode: 'new' })

  const startEdit = (usuario: Usuario) =>
    openDraft(
      { mode: 'edit', id: usuario.id },
      {
        ...usuario,
        password: '',
        vigenciaFini: usuario.vigenciaFini ?? '',
        vigenciaFechafin: usuario.vigenciaFechafin ?? '',
      },
    )

  const isEditing = (id: number) => draft?.mode === 'edit' && draft.id === id

  const patch = (campo: keyof FormValues, valor: string) => {
    setValues((prev) => ({ ...prev, [campo]: valor }))
    setFieldErrors((prev) => {
      if (!prev[campo]) return prev
      const resto: FieldErrors = { ...prev }
      delete resto[campo]
      return resto
    })
  }

  const save = async () => {
    if (!draft) return

    const errores = validate(values, draft, users)
    if (Object.keys(errores).length > 0) {
      setFieldErrors(errores)
      onNotify(Object.values(errores)[0] ?? 'REVISE LOS DATOS', true)
      return
    }

    const payload: UsuarioPayload = {
      usuario: values.usuario.trim().toUpperCase(),
      password: values.password.trim() || null,
      tipoUsuario: values.tipoUsuario,
      vigenciaFini: values.vigenciaFini || null,
      vigenciaFechafin: values.vigenciaFechafin || null,
      estatus: values.estatus,
    }

    setSaving(true)
    setFieldErrors({})
    try {
      if (draft.mode === 'new') {
        const creado = await createUser(payload)
        setUsers((prev) => [...prev, creado])
        onNotify('USUARIO GUARDADO')
      } else {
        const actualizado = await updateUser(draft.id, payload)
        setUsers((prev) => prev.map((item) => (item.id === actualizado.id ? actualizado : item)))
        onNotify('USUARIO ACTUALIZADO')
      }
      closeDraft()
    } catch (error) {
      onNotify(messageOf(error), true)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (usuario: Usuario) => {
    const confirmado = window.confirm(`¿ELIMINAR EL USUARIO "${usuario.usuario}"?`)
    if (!confirmado) return

    if (isEditing(usuario.id)) closeDraft()

    setDeletingId(usuario.id)
    try {
      await deleteUser(usuario.id)
      setUsers((prev) => prev.filter((item) => item.id !== usuario.id))
      onNotify('USUARIO ELIMINADO')
    } catch (error) {
      onNotify(messageOf(error), true)
    } finally {
      setDeletingId(null)
    }
  }

  const adding = draft?.mode === 'new'
  const errorClass = (campo: keyof FormValues) =>
    fieldErrors[campo] ? 'cell-input cell-error' : 'cell-input'

  /** Fila editable: sin usuario es la fila de alta. */
  const editRow = (usuario?: Usuario) => (
    <tr key={usuario?.id ?? 'new'} className={usuario ? 'row-editing' : 'row-editing row-new'}>
      <td className="col-id">{usuario?.id ?? 'NUEVO'}</td>
      <td>
        <input
          type="text"
          className={errorClass('usuario')}
          value={values.usuario}
          aria-label="USUARIO"
          maxLength={USUARIO_MAXIMO}
          placeholder={usuario ? undefined : 'NOMBRE DE USUARIO'}
          onChange={(e) => patch('usuario', e.target.value)}
        />
        {fieldErrors.usuario && <span className="field-error">{fieldErrors.usuario}</span>}
      </td>
      <td>
        <div className="password-cell">
          <input
            type={showPassword ? 'text' : 'password'}
            className={errorClass('password')}
            value={values.password}
            aria-label="CONTRASEÑA"
            placeholder={usuario ? 'SIN CAMBIOS' : 'CONTRASEÑA'}
            onChange={(e) => patch('password', e.target.value)}
          />
          <button
            type="button"
            className="btn-icon"
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? 'OCULTAR' : 'VER'}
          </button>
        </div>
        {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
      </td>
      <td>
        <select
          className="cell-select"
          value={values.tipoUsuario}
          aria-label="TIPO DE USUARIO"
          onChange={(e) => patch('tipoUsuario', e.target.value)}
        >
          {TIPO_USUARIO_OPCIONES.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          type="date"
          className="cell-input"
          value={values.vigenciaFini}
          aria-label="VIGENCIA INICIAL"
          onChange={(e) => patch('vigenciaFini', e.target.value)}
        />
      </td>
      <td>
        <input
          type="date"
          className={errorClass('vigenciaFechafin')}
          value={values.vigenciaFechafin}
          aria-label="VIGENCIA FINAL"
          onChange={(e) => patch('vigenciaFechafin', e.target.value)}
        />
        {fieldErrors.vigenciaFechafin && (
          <span className="field-error">{fieldErrors.vigenciaFechafin}</span>
        )}
      </td>
      <td>
        <select
          className="cell-select"
          value={values.estatus}
          aria-label="ESTATUS"
          onChange={(e) => patch('estatus', e.target.value)}
        >
          {ESTATUS_OPCIONES.map((estatus) => (
            <option key={estatus} value={estatus}>
              {estatus}
            </option>
          ))}
        </select>
      </td>
      <td>
        <div className="row-actions">
          <button
            type="button"
            className="btn-green"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? 'GUARDANDO...' : 'GUARDAR'}
          </button>
          <button type="button" className="btn-gray" disabled={saving} onClick={closeDraft}>
            CANCELAR
          </button>
        </div>
      </td>
    </tr>
  )

  return (
    <div id="screen-users" className="users-screen">
      <h2>CONTROL DE USUARIOS</h2>

      <p className="users-hint">
        LA CONTRASEÑA SE GUARDA CIFRADA. AL MODIFICAR, DEJE EL CAMPO VACÍO PARA MANTENER LA ACTUAL.
      </p>

      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th className="col-id">ID</th>
              <th>USUARIO</th>
              <th>CONTRASEÑA</th>
              <th>TIPO DE USUARIO</th>
              <th>VIGENCIA FINI</th>
              <th>VIGENCIA FECHAFIN</th>
              <th>ESTATUS</th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COLSPAN} className="users-state">
                  CARGANDO USUARIOS...
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan={COLSPAN} className="users-state users-state-error">
                  {loadError}
                  <button type="button" className="btn-blue inline-action" onClick={reload}>
                    REINTENTAR
                  </button>
                </td>
              </tr>
            ) : (
              <>
                {users.length === 0 && !adding && (
                  <EmptyRows
                    colSpan={COLSPAN}
                    filtered={false}
                    defaultLabel="NO HAY USUARIOS REGISTRADOS"
                    onReset={reload}
                  />
                )}

                {users.map((usuario) =>
                  isEditing(usuario.id) ? (
                    editRow(usuario)
                  ) : (
                    <tr key={usuario.id}>
                      <td className="col-id">{usuario.id}</td>
                      <td>{usuario.usuario}</td>
                      <td>
                        <span className="masked" title="CONTRASEÑA ALMACENADA EN ARREGLO">
                          ••••••••
                        </span>
                      </td>
                      <td>{usuario.tipoUsuario}</td>
                      <td>{formatFecha(usuario.vigenciaFini)}</td>
                      <td>{formatFecha(usuario.vigenciaFechafin)}</td>
                      <td>
                        <span className={usuario.estatus === 'ACTIVO' ? 'status-on' : 'status-off'}>
                          {usuario.estatus}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="btn-blue" onClick={() => startEdit(usuario)}>
                            EDITAR
                          </button>
                          <button
                            type="button"
                            className="btn-red"
                            disabled={deletingId === usuario.id}
                            onClick={() => void remove(usuario)}
                          >
                            {deletingId === usuario.id ? 'BORRANDO...' : 'ELIMINAR'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}

                {adding ? (
                  editRow()
                ) : (
                  !loading &&
                  !loadError && (
                    <tr className="new-row">
                      <td colSpan={COLSPAN} className="new-row-cell">
                        <button type="button" className="btn-green inline-action" onClick={startNew}>
                          + NUEVO USUARIO
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <button type="button" className="btn-gray" onClick={onBack}>
        VOLVER AL MENÚ
      </button>
    </div>
  )
}
