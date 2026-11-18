import { useEffect, useState, type FormEvent } from 'react'
import './App.css'
import { fetchSession, login, logout } from './api/auth'
import { setOnSessionExpired } from './api/client'
import { fetchInventario, fetchMovimientos, fetchUbicaciones } from './api/inventario'
import { EmptyRows, StatusRow } from './components/filters/EmptyRows'
import { FilterBar } from './components/filters/FilterBar'
import { UserContextBar } from './components/layout/UserContextBar'
import { UsersScreen } from './components/users/UsersScreen'
import { useRemoteData } from './hooks/useRemoteData'
import { useTableFilters } from './hooks/useTableFilters'
import { useTheme } from './hooks/useTheme'
import type { InventarioMaterial, Movimiento } from './types/inventario'
import type { Usuario } from './types/user'

type ColumnDef = { key: keyof Movimiento; label: string }

/** Estructura común para las tablas de todas las plantas. */
const TRANSFER_COLUMNS: ColumnDef[] = [
  { key: 'fecha', label: 'FECHA' },
  { key: 'material', label: 'MATERIAL' },
  { key: 'lote', label: 'LOTE' },
  { key: 'origen', label: 'ORIGEN' },
  { key: 'destino', label: 'DESTINO' },
  { key: 'cantidad', label: 'CANTIDAD' },
]

const NO_ROWS: never[] = []

const inventoryMaterialKey = (item: InventarioMaterial) => item.sku
const transferMaterialKey = (transfer: Movimiento) => transfer.material
const transferDateKey = (transfer: Movimiento) => transfer.fecha

const loadPlantNames = () =>
  fetchUbicaciones().then((ubicaciones) =>
    ubicaciones.filter((u) => u.tipo === 'PLANTA' && u.activo).map((u) => u.nombre),
  )

function App() {
  const [activeScreen, setActiveScreen] = useState('screen-login')
  const [loginUser, setLoginUser] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [showLoginPass, setShowLoginPass] = useState(false)
  const [session, setSession] = useState<Usuario | null>(null)
  // Mientras se consulta /auth/me no se muestra el login, para no parpadear al recargar.
  const [checkingSession, setCheckingSession] = useState(true)
  const [loggingIn, setLoggingIn] = useState(false)
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null)
  const [message, setMessage] = useState({ text: '', isError: false, visible: false })

  const { theme, toggleTheme } = useTheme()

  const showMessage = (text: string, isError = false) => {
    setMessage({ text, isError, visible: true })
  }

  const showError = (text: string) => showMessage(text, true)

  // Cada pantalla consulta la API al abrirse (key = null mientras no está visible).
  const inventory = useRemoteData(
    activeScreen === 'screen-inventory' ? 'inventario' : null,
    fetchInventario,
    showError,
  )
  const plantNames = useRemoteData(
    activeScreen === 'screen-transfer' ? 'plantas' : null,
    loadPlantNames,
    showError,
  )
  const plantMovements = useRemoteData(
    activeScreen === 'screen-transfer' && selectedPlant ? `movimientos:${selectedPlant}` : null,
    () => fetchMovimientos(selectedPlant ?? undefined),
    showError,
  )
  const history = useRemoteData(
    activeScreen === 'screen-history' ? 'historial' : null,
    () => fetchMovimientos(),
    showError,
  )

  const plantColumns = inventory.data?.plantas ?? NO_ROWS

  const inventoryFilters = useTableFilters<InventarioMaterial>({
    rows: inventory.data?.materiales ?? NO_ROWS,
    materialKey: inventoryMaterialKey,
  })

  const plantFilters = useTableFilters<Movimiento>({
    rows: plantMovements.data ?? NO_ROWS,
    materialKey: transferMaterialKey,
    dateKey: transferDateKey,
  })

  const historyFilters = useTableFilters<Movimiento>({
    rows: history.data ?? NO_ROWS,
    materialKey: transferMaterialKey,
    dateKey: transferDateKey,
  })

  const resetPlantFilters = plantFilters.reset

  // Cada planta tiene sus propios registros: al cambiar de planta se limpian los filtros.
  useEffect(() => {
    resetPlantFilters()
  }, [selectedPlant, resetPlantFilters])

  useEffect(() => {
    if (!message.visible) return

    const timer = window.setTimeout(() => {
      setMessage((prev) => ({ ...prev, visible: false }))
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [message.visible])

  // La cookie sobrevive a recargar la página: si sigue vigente se entra directo al menú.
  useEffect(() => {
    fetchSession()
      .then((usuario) => {
        if (!usuario) return
        setSession(usuario)
        setActiveScreen('screen-menu')
      })
      .catch(() => showMessage('SIN CONEXIÓN CON EL SERVIDOR', true))
      .finally(() => setCheckingSession(false))
  }, [])

  useEffect(() => {
    setOnSessionExpired(() => {
      setSession(null)
      setSelectedPlant(null)
      setActiveScreen('screen-login')
      showMessage('SESIÓN EXPIRADA, INICIE SESIÓN DE NUEVO', true)
    })
    return () => setOnSessionExpired(null)
  }, [])

  const isAdmin = session?.tipoUsuario === 'ADMINISTRADOR'

  const showScreen = (screenId: string) => {
    setActiveScreen(screenId)
    if (screenId !== 'screen-transfer') {
      setSelectedPlant(null)
    }
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loggingIn) return

    setLoggingIn(true)
    try {
      const usuario = await login(loginUser, loginPass)
      setSession(usuario)
      setLoginUser('')
      setLoginPass('')
      setShowLoginPass(false)
      setActiveScreen('screen-menu')
      showMessage('ACCESO CONCEDIDO')
    } catch (error) {
      setLoginPass('')
      showMessage(error instanceof Error ? error.message : 'ERROR INESPERADO', true)
    } finally {
      setLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // Aunque falle la red, del lado del cliente la sesión se cierra igual.
    }
    setSession(null)
    setLoginUser('')
    setLoginPass('')
    setSelectedPlant(null)
    setActiveScreen('screen-login')
    showMessage('SESIÓN CERRADA')
  }

  return (
    <>
      <div
        id="message-box"
        className={message.visible ? (message.isError ? 'msg-error' : '') : 'hidden'}
        aria-live="polite"
      >
        {message.text}
      </div>

      <UserContextBar
        session={session}
        activeScreen={activeScreen}
        selectedPlant={selectedPlant}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigate={showScreen}
        onLogout={handleLogout}
      />

      {activeScreen === 'screen-login' && !checkingSession && (
        <form id="screen-login" className="center-container" onSubmit={handleLogin}>
          <div className="form-group">
            <label>USUARIO:</label>
            <input
              type="text"
              id="login-user"
              placeholder="INGRESE USUARIO"
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>CONTRASEÑA:</label>
            <div className="password-field">
              <input
                type={showLoginPass ? 'text' : 'password'}
                id="login-pass"
                placeholder="INGRESE CONTRASEÑA"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showLoginPass ? 'OCULTAR CONTRASEÑA' : 'MOSTRAR CONTRASEÑA'}
                aria-pressed={showLoginPass}
                onClick={() => setShowLoginPass((prev) => !prev)}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                  {showLoginPass && <path d="M3 3l18 18" />}
                </svg>
              </button>
            </div>
          </div>
          <button type="submit" className="btn-green" id="btn-login" disabled={loggingIn}>
            {loggingIn ? 'VALIDANDO...' : 'INICIAR SESION'}
          </button>
        </form>
      )}

      {activeScreen === 'screen-menu' && (
        <div id="screen-menu">
          <div className="grid-menu">
            <button className="btn-blue" onClick={() => showScreen('screen-inventory')}>
              INVENTARIO<br />GENERAL
            </button>
            <button className="btn-blue" onClick={() => showScreen('screen-transfer')}>
              SEGUIMIENTO<br />ENTRE PLANTAS
            </button>
            <button className="btn-blue" onClick={() => showScreen('screen-history')}>
              HISTORIAL<br />DE TRASPASOS
            </button>
            {isAdmin && (
              <button className="btn-blue" onClick={() => showScreen('screen-users')}>
                USUARIOS<br />DEL SISTEMA
              </button>
            )}
            <button className="btn-red" id="btn-logout" onClick={handleLogout}>
              CERRAR SESIÓN
            </button>
          </div>
        </div>
      )}

      {activeScreen === 'screen-inventory' && (
        <div id="screen-inventory">
          <h2>INVENTARIO UNIFICADO</h2>

          <FilterBar filters={inventoryFilters} />

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>PIEZA / SKU</th>
                  {plantColumns.map((plant) => (
                    <th key={plant}>{plant.toUpperCase()}</th>
                  ))}
                  <th>TOTAL GLOBAL</th>
                </tr>
              </thead>
              <tbody id="inventory-tbody">
                {inventory.loading ? (
                  <StatusRow colSpan={plantColumns.length + 2}>CARGANDO INVENTARIO...</StatusRow>
                ) : inventory.error ? (
                  <StatusRow colSpan={plantColumns.length + 2}>{inventory.error}</StatusRow>
                ) : inventoryFilters.filtered.length === 0 ? (
                  <EmptyRows
                    colSpan={plantColumns.length + 2}
                    filtered={inventoryFilters.isActive}
                    defaultLabel="NO HAY MATERIALES REGISTRADOS"
                    onReset={inventoryFilters.reset}
                  />
                ) : (
                  inventoryFilters.filtered.map((item) => (
                    <tr key={item.sku}>
                      <td>
                        <strong>{item.sku}</strong>
                        <br />
                        <small>{item.nombre}</small>
                      </td>
                      {plantColumns.map((plant) => (
                        <td key={plant}>{item.existencias[plant] ?? 0}</td>
                      ))}
                      <td className="total-cell">{item.total}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <button className="btn-gray" onClick={() => showScreen('screen-menu')}>
            VOLVER AL MENÚ
          </button>
        </div>
      )}

      {activeScreen === 'screen-transfer' && (
        <div id="screen-transfer" className="plant-tracking-screen">
          <h2>SEGUIMIENTO DE MOVIMIENTOS</h2>

          {!selectedPlant && plantNames.loading && <p className="screen-status">CARGANDO PLANTAS...</p>}
          {!selectedPlant && plantNames.error && <p className="screen-status">{plantNames.error}</p>}

          {!selectedPlant && plantNames.data && (
            <div className="plant-selector-grid">
              {plantNames.data.map((plant) => (
                <button
                  key={plant}
                  type="button"
                  className="plant-button"
                  onClick={() => setSelectedPlant(plant)}
                >
                  {plant}
                </button>
              ))}
            </div>
          )}

          {selectedPlant && (
            <>
              <div className="plant-detail-header">
                <h3>{selectedPlant}</h3>
                <button type="button" className="btn-gray compact" onClick={() => setSelectedPlant(null)}>
                  VOLVER
                </button>
              </div>

              <FilterBar filters={plantFilters} withDate />

              <div className="table-container plant-table-container">
                <table>
                  <thead>
                    <tr>
                      {TRANSFER_COLUMNS.map((column) => (
                        <th key={column.key}>{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {plantMovements.loading ? (
                      <StatusRow colSpan={TRANSFER_COLUMNS.length}>CARGANDO MOVIMIENTOS...</StatusRow>
                    ) : plantMovements.error ? (
                      <StatusRow colSpan={TRANSFER_COLUMNS.length}>{plantMovements.error}</StatusRow>
                    ) : plantFilters.filtered.length === 0 ? (
                      <EmptyRows
                        colSpan={TRANSFER_COLUMNS.length}
                        filtered={plantFilters.isActive}
                        defaultLabel="NO HAY MOVIMIENTOS REGISTRADOS"
                        onReset={plantFilters.reset}
                      />
                    ) : (
                      plantFilters.filtered.map((transfer) => (
                        <tr key={transfer.id}>
                          {TRANSFER_COLUMNS.map((column) => (
                            <td key={column.key}>
                              {column.key === 'cantidad' ? <strong>{transfer[column.key]}</strong> : transfer[column.key]}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <button type="button" className="btn-gray" onClick={() => showScreen('screen-menu')}>
            VOLVER AL MENÚ
          </button>
        </div>
      )}

      {activeScreen === 'screen-history' && (
        <div id="screen-history">
          <h2>HISTORIAL RECIENTE</h2>

          <FilterBar filters={historyFilters} withDate />

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  {TRANSFER_COLUMNS.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody id="history-tbody">
                {history.loading ? (
                  <StatusRow colSpan={TRANSFER_COLUMNS.length}>CARGANDO HISTORIAL...</StatusRow>
                ) : history.error ? (
                  <StatusRow colSpan={TRANSFER_COLUMNS.length}>{history.error}</StatusRow>
                ) : historyFilters.filtered.length === 0 ? (
                  <EmptyRows
                    colSpan={TRANSFER_COLUMNS.length}
                    filtered={historyFilters.isActive}
                    defaultLabel="NO HAY TRASPASOS REGISTRADOS"
                    onReset={historyFilters.reset}
                  />
                ) : (
                  historyFilters.filtered.map((transfer) => (
                    <tr key={transfer.id}>
                      {TRANSFER_COLUMNS.map((column) => (
                        <td key={column.key}>
                          {column.key === 'cantidad' ? <strong>{transfer[column.key]}</strong> : transfer[column.key]}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <button className="btn-gray" onClick={() => showScreen('screen-menu')}>
            VOLVER AL MENÚ
          </button>
        </div>
      )}

      {activeScreen === 'screen-users' && isAdmin && (
        <UsersScreen onBack={() => showScreen('screen-menu')} onNotify={showMessage} />
      )}
    </>
  )
}

export default App
