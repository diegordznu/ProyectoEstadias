import { useEffect, useState } from 'react'
import './App.css'
import { EmptyRows } from './components/filters/EmptyRows'
import { FilterBar } from './components/filters/FilterBar'
import { useTableFilters } from './hooks/useTableFilters'
import { daysAgo, monthsAgo } from './lib/dates'

type InventoryItem = {
  sku: string
  name: string
  p1: number
  p2: number
  p3: number
  p6: number
}

type TransferRecord = {
  date: string
  piece: string
  lote: string
  saldo: number
  origin: string
  dest: string
  piezaResult: string
  qty: number
}

type ColumnDef = { key: keyof TransferRecord; label: string }

type PlantTable = { columns: ColumnDef[]; transfers: TransferRecord[] }

const PLANT_TABLES: Record<string, PlantTable> = {
  'Planta 1': {
    columns: [
      { key: 'date', label: 'FECHA' },
      { key: 'piece', label: 'MATERIAL' },
      { key: 'lote', label: 'LOTE' },
      { key: 'saldo', label: 'SALDO' },
      { key: 'origin', label: 'ORIGEN' },
      { key: 'dest', label: 'DESTINO' },
      { key: 'piezaResult', label: 'PIEZA RESULT.' },
      { key: 'qty', label: 'CANTIDAD' },
    ],
    transfers: [
      { date: daysAgo(1), piece: 'MOD-AC-01', lote: 'L-1001', saldo: 150, origin: 'Planta 2', dest: 'Planta 1', piezaResult: 'MOD-AC-01', qty: 20 },
      { date: daysAgo(4), piece: 'RAD-AL-99', lote: 'L-1002', saldo: 80, origin: 'Planta 1', dest: 'Planta 3', piezaResult: 'RAD-AL-99-C', qty: 15 },
      { date: daysAgo(9), piece: 'SOP-MT-55', lote: 'L-1003', saldo: 200, origin: 'Planta 6', dest: 'Planta 1', piezaResult: 'SOP-MT-55', qty: 40 },
      { date: daysAgo(22), piece: 'SEN-TM-44', lote: 'L-1004', saldo: 60, origin: 'Planta 1', dest: 'Planta 2', piezaResult: 'SEN-TM-44', qty: 35 },
      { date: daysAgo(74), piece: 'COR-VT-88', lote: 'L-1005', saldo: 120, origin: 'Planta 3', dest: 'Planta 1', piezaResult: 'COR-VT-88-R', qty: 50 },
      { date: monthsAgo(5), piece: 'BOM-AG-77', lote: 'L-1006', saldo: 45, origin: 'Planta 1', dest: 'Planta 6', piezaResult: 'BOM-AG-77', qty: 12 },
    ],
  },
  'Planta 2': {
    columns: [
      { key: 'date', label: 'FECHA' },
      { key: 'piece', label: 'MATERIAL' },
      { key: 'origin', label: 'ORIGEN' },
      { key: 'dest', label: 'DESTINO' },
      { key: 'qty', label: 'CANTIDAD' },
    ],
    transfers: [
      { date: daysAgo(2), piece: 'MOD-AC-01', lote: 'L-1001', saldo: 45, origin: 'Planta 2', dest: 'Planta 1', piezaResult: 'MOD-AC-01', qty: 20 },
      { date: daysAgo(11), piece: 'FIL-CB-22', lote: 'L-2001', saldo: 800, origin: 'Planta 2', dest: 'Planta 6', piezaResult: 'FIL-CB-22-R', qty: 100 },
      { date: daysAgo(38), piece: 'INT-FR-66', lote: 'L-2002', saldo: 25, origin: 'Planta 2', dest: 'Planta 3', piezaResult: 'INT-FR-66-R', qty: 8 },
    ],
  },
  'Planta 3': {
    columns: [
      { key: 'date', label: 'FECHA' },
      { key: 'piece', label: 'MATERIAL' },
      { key: 'lote', label: 'LOTE' },
      { key: 'origin', label: 'ORIGEN' },
      { key: 'dest', label: 'DESTINO' },
      { key: 'piezaResult', label: 'PIEZA RESULT.' },
      { key: 'qty', label: 'CANTIDAD' },
    ],
    transfers: [
      { date: daysAgo(3), piece: 'RAD-AL-99', lote: 'L-1002', saldo: 120, origin: 'Planta 1', dest: 'Planta 3', piezaResult: 'RAD-AL-99-C', qty: 15 },
      { date: daysAgo(17), piece: 'VAL-EX-33', lote: 'L-3001', saldo: 70, origin: 'Planta 3', dest: 'Planta 6', piezaResult: 'VAL-EX-33-R', qty: 25 },
      { date: daysAgo(65), piece: 'SOP-MT-55', lote: 'L-3002', saldo: 90, origin: 'Planta 3', dest: 'Planta 2', piezaResult: 'SOP-MT-55', qty: 18 },
    ],
  },
  'Planta 6': {
    columns: [
      { key: 'date', label: 'FECHA' },
      { key: 'piece', label: 'MATERIAL' },
      { key: 'lote', label: 'LOTE' },
      { key: 'saldo', label: 'SALDO' },
      { key: 'origin', label: 'ORIGEN' },
      { key: 'dest', label: 'DESTINO' },
      { key: 'qty', label: 'CANTIDAD' },
    ],
    transfers: [
      { date: daysAgo(5), piece: 'SOP-MT-55', lote: 'L-1003', saldo: 800, origin: 'Planta 6', dest: 'Planta 1', piezaResult: 'SOP-MT-55', qty: 40 },
      { date: daysAgo(8), piece: 'FIL-CB-22', lote: 'L-2001', saldo: 600, origin: 'Planta 2', dest: 'Planta 6', piezaResult: 'FIL-CB-22-R', qty: 100 },
      { date: daysAgo(13), piece: 'VAL-EX-33', lote: 'L-3001', saldo: 95, origin: 'Planta 3', dest: 'Planta 6', piezaResult: 'VAL-EX-33-R', qty: 25 },
      { date: daysAgo(29), piece: 'TUB-RD-11', lote: 'L-6001', saldo: 250, origin: 'Planta 6', dest: 'Planta 2', piezaResult: 'TUB-RD-11-R', qty: 60 },
      { date: daysAgo(47), piece: 'MOD-AC-01', lote: 'L-6002', saldo: 130, origin: 'Planta 6', dest: 'Planta 3', piezaResult: 'MOD-AC-01', qty: 22 },
      { date: monthsAgo(4), piece: 'COR-VT-88', lote: 'L-6003', saldo: 310, origin: 'Planta 6', dest: 'Planta 1', piezaResult: 'COR-VT-88-R', qty: 75 },
    ],
  },
}

const PLANT_OPTIONS = Object.keys(PLANT_TABLES)

const allTransfers = Object.values(PLANT_TABLES).flatMap((table) => table.transfers)

const inventoryMaterialKey = (item: InventoryItem) => item.sku
const transferMaterialKey = (transfer: TransferRecord) => transfer.piece
const transferDateKey = (transfer: TransferRecord) => transfer.date

const initialInventory: InventoryItem[] = [
  { sku: 'MOD-AC-01', name: 'MÓDULO AIRE ACONDICIONADO V8', p1: 150, p2: 45, p3: 300, p6: 200 },
  { sku: 'RAD-AL-99', name: 'RADIADOR ALUMINIO REFORZADO', p1: 80, p2: 120, p3: 50, p6: 150 },
  { sku: 'SOP-MT-55', name: 'SOPORTE MOTOR HIDRÁULICO', p1: 200, p2: 200, p3: 1000, p6: 800 },
  { sku: 'FIL-CB-22', name: 'FILTRO DE CABINA CARBÓN', p1: 500, p2: 800, p3: 1200, p6: 600 },
  { sku: 'BOM-AG-77', name: 'BOMBA DE AGUA ALTA PRESIÓN', p1: 60, p2: 40, p3: 30, p6: 20 },
  { sku: 'COR-VT-88', name: 'CORREA VENTILADOR TENSIÓN', p1: 300, p2: 250, p3: 400, p6: 350 },
  { sku: 'VAL-EX-33', name: 'VÁLVULA EXHAUSTO V6', p1: 90, p2: 70, p3: 110, p6: 95 },
  { sku: 'SEN-TM-44', name: 'SENSOR TEMPERATURA MOTOR', p1: 150, p2: 130, p3: 160, p6: 140 },
  { sku: 'INT-FR-66', name: 'INTERCOOLER FRONTAL REFORZADO', p1: 25, p2: 15, p3: 10, p6: 5 },
  { sku: 'TUB-RD-11', name: 'TUBERÍA RADIADOR DOBLE PARED', p1: 400, p2: 350, p3: 300, p6: 250 },
]

function App() {
  const [activeScreen, setActiveScreen] = useState('screen-login')
  const [loginUser, setLoginUser] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [inventoryData] = useState<InventoryItem[]>(initialInventory)
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null)
  const [message, setMessage] = useState({ text: '', isError: false, visible: false })

  const inventoryFilters = useTableFilters<InventoryItem>({
    rows: inventoryData,
    materialKey: inventoryMaterialKey,
  })

  const plantFilters = useTableFilters<TransferRecord>({
    rows: selectedPlant ? PLANT_TABLES[selectedPlant].transfers : [],
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

  const showScreen = (screenId: string) => {
    setActiveScreen(screenId)
    if (screenId !== 'screen-transfer') {
      setSelectedPlant(null)
    }
  }

  const handleLogin = () => {
    showMessage('ACCESO CONCEDIDO')
    setActiveScreen('screen-menu')
  }

  const handleLogout = () => {
    setLoginUser('')
    setLoginPass('')
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

      <header>
        <h1>GRUPO ARMAS</h1>
      </header>

      {activeScreen === 'screen-login' && (
        <div id="screen-login" className="center-container">
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
            <input
              type="password"
              id="login-pass"
              placeholder="INGRESE CONTRASEÑA"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
            />
          </div>
          <button className="btn-green" id="btn-login" onClick={handleLogin}>
            INICIAR SESION
          </button>
        </div>
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
            <button className="btn-red" id="btn-logout" onClick={handleLogout}>
              CERRAR SESIÓN
            </button>
          </div>
        </div>
      )}

      {activeScreen === 'screen-inventory' && (
        <div id="screen-inventory">
          <h2>INVENTARIO UNIFICADO</h2>

          <FilterBar
            total={inventoryFilters.total}
            shown={inventoryFilters.filtered.length}
            isActive={inventoryFilters.isActive}
            materials={{
              options: inventoryFilters.options,
              value: inventoryFilters.materials,
              onChange: inventoryFilters.setMaterials,
            }}
            onReset={inventoryFilters.reset}
          />

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>PIEZA / SKU</th>
                  <th>PLANTA 1</th>
                  <th>PLANTA 2</th>
                  <th>PLANTA 3</th>
                  <th>PLANTA 6</th>
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
                  inventoryFilters.filtered.map((item) => {
                    const total = item.p1 + item.p2 + item.p3 + item.p6

                    return (
                      <tr key={item.sku}>
                        <td>
                          <strong>{item.sku}</strong>
                          <br />
                          <small>{item.name}</small>
                        </td>
                        <td>{item.p1}</td>
                        <td>{item.p2}</td>
                        <td>{item.p3}</td>
                        <td>{item.p6}</td>
                        <td className="total-cell">{total}</td>
                      </tr>
                    )
                  })
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

              <FilterBar
                total={plantFilters.total}
                shown={plantFilters.filtered.length}
                isActive={plantFilters.isActive}
                materials={{
                  options: plantFilters.options,
                  value: plantFilters.materials,
                  onChange: plantFilters.setMaterials,
                }}
                date={{
                  preset: plantFilters.preset,
                  customRange: plantFilters.customRange,
                  range: plantFilters.range,
                  onPresetChange: plantFilters.setPreset,
                  onCustomRangeChange: plantFilters.setCustomRange,
                }}
                onReset={plantFilters.reset}
              />

              <div className="table-container plant-table-container">
                <table>
                  <thead>
                    <tr>
                      {PLANT_TABLES[selectedPlant].columns.map((column) => (
                        <th key={column.key}>{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {plantFilters.filtered.length === 0 ? (
                      <EmptyRows
                        colSpan={PLANT_TABLES[selectedPlant].columns.length}
                        filtered={plantFilters.isActive}
                        defaultLabel="NO HAY MOVIMIENTOS REGISTRADOS"
                        onReset={plantFilters.reset}
                      />
                    ) : (
                      plantFilters.filtered.map((transfer, index) => (
                        <tr key={`${selectedPlant}-${transfer.date}-${transfer.piece}-${index}`}>
                          {PLANT_TABLES[selectedPlant].columns.map((column) => (
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

          <FilterBar
            total={historyFilters.total}
            shown={historyFilters.filtered.length}
            isActive={historyFilters.isActive}
            materials={{
              options: historyFilters.options,
              value: historyFilters.materials,
              onChange: historyFilters.setMaterials,
            }}
            date={{
              preset: historyFilters.preset,
              customRange: historyFilters.customRange,
              range: historyFilters.range,
              onPresetChange: historyFilters.setPreset,
              onCustomRangeChange: historyFilters.setCustomRange,
            }}
            onReset={historyFilters.reset}
          />

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
    </>
  )
}

export default App
