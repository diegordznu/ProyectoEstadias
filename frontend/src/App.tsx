import { useEffect, useState, type FormEvent } from 'react'
import './App.css'
import { fetchSession, login, logout } from './api/auth'
import { setOnSessionExpired } from './api/client'
import { EmptyRows } from './components/filters/EmptyRows'
import { FilterBar } from './components/filters/FilterBar'
import { UserContextBar } from './components/layout/UserContextBar'
import { UsersScreen } from './components/users/UsersScreen'
import { useTableFilters } from './hooks/useTableFilters'
import { useTheme } from './hooks/useTheme'
import { daysAgo } from './lib/dates'
import { PLANTS, computeInventory, type InventoryItem, type InventoryMovement, type Material, type Plant } from './lib/inventory'
import type { Usuario } from './types/user'

type TransferRecord = InventoryMovement & {
  /** Fecha y hora del movimiento: 'YYYY-MM-DD HH:mm'. */
  date: string
  lote: string
}

type ColumnDef = { key: keyof TransferRecord; label: string }

/** Estructura común para las tablas de todas las plantas. */
const TRANSFER_COLUMNS: ColumnDef[] = [
  { key: 'date', label: 'FECHA' },
  { key: 'piece', label: 'MATERIAL' },
  { key: 'lote', label: 'LOTE' },
  { key: 'origin', label: 'PROVEEDOR (ORIGEN)' },
  { key: 'dest', label: 'DESTINO' },
  { key: 'qty', label: 'CANTIDAD' },
]

const MATERIALS: Material[] = [
  { sku: 'MOD-AC-01', name: 'MÓDULO AIRE ACONDICIONADO V8' },
  { sku: 'RAD-AL-99', name: 'RADIADOR ALUMINIO REFORZADO' },
  { sku: 'SOP-MT-55', name: 'SOPORTE MOTOR HIDRÁULICO' },
  { sku: 'FIL-CB-22', name: 'FILTRO DE CABINA CARBÓN' },
  { sku: 'BOM-AG-77', name: 'BOMBA DE AGUA ALTA PRESIÓN' },
  { sku: 'COR-VT-88', name: 'CORREA VENTILADOR TENSIÓN' },
  { sku: 'VAL-EX-33', name: 'VÁLVULA EXHAUSTO V6' },
  { sku: 'SEN-TM-44', name: 'SENSOR TEMPERATURA MOTOR' },
  { sku: 'INT-FR-66', name: 'INTERCOOLER FRONTAL REFORZADO' },
  { sku: 'TUB-RD-11', name: 'TUBERÍA RADIADOR DOBLE PARED' },
]

/**
 * Registro único de movimientos (más reciente primero). Cada movimiento se captura una sola vez:
 * aparece en la tabla de su planta de origen y en la de su planta destino, y alimenta el inventario.
 * Las entradas desde un proveedor externo solo suman en la planta destino.
 */
const MOVEMENTS: TransferRecord[] = [
  { date: daysAgo(1, '13:05'), piece: 'MOD-AC-01', lote: 'L-2405-01', origin: 'Planta 1', dest: 'Planta 2', qty: 30 },
  { date: daysAgo(2, '10:40'), piece: 'FIL-CB-22', lote: 'L-2406-01', origin: 'Planta 2', dest: 'Planta 3', qty: 120 },
  { date: daysAgo(4, '08:25'), piece: 'VAL-EX-33', lote: 'L-2406-04', origin: 'Planta 3', dest: 'Planta 1', qty: 30 },
  { date: daysAgo(6, '15:15'), piece: 'TUB-RD-11', lote: 'L-2407-03', origin: 'Planta 2', dest: 'Planta 3', qty: 80 },
  { date: daysAgo(9, '12:50'), piece: 'SEN-TM-44', lote: 'L-2407-01', origin: 'Planta 2', dest: 'Planta 3', qty: 60 },
  { date: daysAgo(12, '09:20'), piece: 'COR-VT-88', lote: 'L-2406-03', origin: 'Planta 3', dest: 'Planta 2', qty: 100 },
  { date: daysAgo(15, '14:45'), piece: 'RAD-AL-99', lote: 'L-2405-02', origin: 'Planta 2', dest: 'Planta 1', qty: 50 },
  { date: daysAgo(19, '11:30'), piece: 'MOD-AC-01', lote: 'L-2408-01', origin: 'Planta 3', dest: 'Planta 6', qty: 45 },
  { date: daysAgo(24, '07:55'), piece: 'INT-FR-66', lote: 'L-2407-02', origin: 'Planta 1', dest: 'Planta 2', qty: 15 },
  { date: daysAgo(28, '16:10'), piece: 'SOP-MT-55', lote: 'L-2405-03', origin: 'Planta 3', dest: 'Planta 6', qty: 180 },
  { date: daysAgo(35, '10:05'), piece: 'FIL-CB-22', lote: 'L-2408-02', origin: 'Filtros Monterrey', dest: 'Planta 1', qty: 400 },
  { date: daysAgo(42, '13:35'), piece: 'BOM-AG-77', lote: 'L-2406-02', origin: 'Planta 1', dest: 'Planta 6', qty: 25 },
  { date: daysAgo(49, '09:40'), piece: 'VAL-EX-33', lote: 'L-2406-04', origin: 'Planta 6', dest: 'Planta 3', qty: 80 },
  { date: daysAgo(56, '15:50'), piece: 'TUB-RD-11', lote: 'L-2407-03', origin: 'Planta 6', dest: 'Planta 2', qty: 200 },
  { date: daysAgo(63, '12:15'), piece: 'SEN-TM-44', lote: 'L-2407-01', origin: 'Planta 2', dest: 'Planta 1', qty: 90 },
  { date: daysAgo(70, '08:30'), piece: 'MOD-AC-01', lote: 'L-2408-01', origin: 'Termotec Industrial', dest: 'Planta 3', qty: 150 },
  { date: daysAgo(77, '14:20'), piece: 'COR-VT-88', lote: 'L-2406-03', origin: 'Planta 3', dest: 'Planta 6', qty: 120 },
  { date: daysAgo(85, '11:45'), piece: 'RAD-AL-99', lote: 'L-2405-02', origin: 'Planta 2', dest: 'Planta 3', qty: 70 },
  { date: daysAgo(91, '10:55'), piece: 'FIL-CB-22', lote: 'L-2406-01', origin: 'Planta 6', dest: 'Planta 2', qty: 250 },
  { date: daysAgo(98, '16:30'), piece: 'SOP-MT-55', lote: 'L-2405-03', origin: 'Planta 3', dest: 'Planta 1', qty: 150 },
  { date: daysAgo(104, '09:05'), piece: 'MOD-AC-01', lote: 'L-2405-01', origin: 'Planta 1', dest: 'Planta 2', qty: 60 },
  { date: daysAgo(112, '13:10'), piece: 'TUB-RD-11', lote: 'L-2407-03', origin: 'Aceros del Norte', dest: 'Planta 6', qty: 650 },
  { date: daysAgo(119, '08:45'), piece: 'INT-FR-66', lote: 'L-2407-02', origin: 'Termotec Industrial', dest: 'Planta 1', qty: 40 },
  { date: daysAgo(126, '15:25'), piece: 'SEN-TM-44', lote: 'L-2407-01', origin: 'Electro Sensores MX', dest: 'Planta 2', qty: 300 },
  { date: daysAgo(131, '12:40'), piece: 'VAL-EX-33', lote: 'L-2406-04', origin: 'Termotec Industrial', dest: 'Planta 6', qty: 220 },
  { date: daysAgo(138, '10:15'), piece: 'COR-VT-88', lote: 'L-2406-03', origin: 'Aceros del Norte', dest: 'Planta 3', qty: 500 },
  { date: daysAgo(143, '07:50'), piece: 'BOM-AG-77', lote: 'L-2406-02', origin: 'Hidráulica del Bajío', dest: 'Planta 1', qty: 90 },
  { date: daysAgo(151, '14:05'), piece: 'FIL-CB-22', lote: 'L-2406-01', origin: 'Filtros Monterrey', dest: 'Planta 6', qty: 900 },
  { date: daysAgo(160, '11:20'), piece: 'SOP-MT-55', lote: 'L-2405-03', origin: 'Hidráulica del Bajío', dest: 'Planta 3', qty: 600 },
  { date: daysAgo(165, '09:35'), piece: 'RAD-AL-99', lote: 'L-2405-02', origin: 'Aceros del Norte', dest: 'Planta 2', qty: 180 },
  { date: daysAgo(172, '08:10'), piece: 'MOD-AC-01', lote: 'L-2405-01', origin: 'Termotec Industrial', dest: 'Planta 1', qty: 200 },
]

const PLANT_TRANSFERS: Record<Plant, TransferRecord[]> = Object.fromEntries(
  PLANTS.map((plant) => [plant, MOVEMENTS.filter((m) => m.origin === plant || m.dest === plant)]),
) as Record<Plant, TransferRecord[]>

const PLANT_OPTIONS = PLANTS

const allTransfers = MOVEMENTS

const inventoryData = computeInventory(MATERIALS, MOVEMENTS)

const inventoryMaterialKey = (item: InventoryItem) => item.sku
const transferMaterialKey = (transfer: TransferRecord) => transfer.piece
const transferDateKey = (transfer: TransferRecord) => transfer.date

function App() {
  const [activeScreen, setActiveScreen] = useState('screen-login')
  const [loginUser, setLoginUser] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [showLoginPass, setShowLoginPass] = useState(false)
  const [session, setSession] = useState<Usuario | null>(null)
  // Mientras se consulta /auth/me no se muestra el login, para no parpadear al recargar.
  const [checkingSession, setCheckingSession] = useState(true)
  const [loggingIn, setLoggingIn] = useState(false)
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)
  const [message, setMessage] = useState({ text: '', isError: false, visible: false })

  const { theme, toggleTheme } = useTheme()

  const inventoryFilters = useTableFilters<InventoryItem>({
    rows: inventoryData,
    materialKey: inventoryMaterialKey,
  })

  const plantFilters = useTableFilters<TransferRecord>({
    rows: selectedPlant ? PLANT_TRANSFERS[selectedPlant] : [],
    materialKey: transferMaterialKey,
    dateKey: transferDateKey,
  })

  const historyFilters = useTableFilters<TransferRecord>({
    rows: allTransfers,
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

  const showMessage = (text: string, isError = false) => {
    setMessage({ text, isError, visible: true })
  }

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
                  {PLANTS.map((plant) => (
                    <th key={plant}>{plant.toUpperCase()}</th>
                  ))}
                  <th>TOTAL GLOBAL</th>
                </tr>
              </thead>
              <tbody id="inventory-tbody">
                {inventoryFilters.filtered.length === 0 ? (
                  <EmptyRows
                    colSpan={6}
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
                        <small>{item.name}</small>
                      </td>
                      {PLANTS.map((plant) => (
                        <td key={plant}>{item.stock[plant]}</td>
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

          {!selectedPlant && (
            <div className="plant-selector-grid">
              {PLANT_OPTIONS.map((plant) => (
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
                    {plantFilters.filtered.length === 0 ? (
                      <EmptyRows
                        colSpan={TRANSFER_COLUMNS.length}
                        filtered={plantFilters.isActive}
                        defaultLabel="NO HAY MOVIMIENTOS REGISTRADOS"
                        onReset={plantFilters.reset}
                      />
                    ) : (
                      plantFilters.filtered.map((transfer, index) => (
                        <tr key={`${selectedPlant}-${transfer.date}-${transfer.piece}-${index}`}>
                          {TRANSFER_COLUMNS.map((column) => (
                            <td key={column.key}>
                              {column.key === 'qty' ? <strong>{transfer[column.key]}</strong> : transfer[column.key]}
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
                  <th>FECHA</th>
                  <th>PIEZA</th>
                  <th>ORIGEN</th>
                  <th>DESTINO</th>
                  <th>CANTIDAD</th>
                </tr>
              </thead>
              <tbody id="history-tbody">
                {historyFilters.filtered.length === 0 ? (
                  <EmptyRows
                    colSpan={5}
                    filtered={historyFilters.isActive}
                    defaultLabel="NO HAY TRASPASOS REGISTRADOS"
                    onReset={historyFilters.reset}
                  />
                ) : (
                  historyFilters.filtered.map((transfer, index) => (
                    <tr key={`${transfer.date}-${transfer.piece}-${index}`}>
                      <td>{transfer.date}</td>
                      <td>{transfer.piece}</td>
                      <td>{transfer.origin}</td>
                      <td>{transfer.dest}</td>
                      <td>
                        <strong>{transfer.qty}</strong>
                      </td>
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
