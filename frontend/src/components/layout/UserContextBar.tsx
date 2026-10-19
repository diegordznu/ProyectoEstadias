import { useEffect, useState } from 'react'
import logo from '../../assets/logo.svg'
import { formatFecha, type Usuario } from '../../types/user'

type UserContextBarProps = {
  /** null = sin sesión (pantalla de login): la barra muestra solo la marca. */
  session: Usuario | null
  activeScreen: string
  selectedPlant: string | null
  onNavigate: (screen: string) => void
  onLogout: () => void
}

const SCREEN_LABELS: Record<string, string> = {
  'screen-menu': 'MENÚ',
  'screen-inventory': 'INVENTARIO GENERAL',
  'screen-transfer': 'SEGUIMIENTO ENTRE PLANTAS',
  'screen-history': 'HISTORIAL DE TRASPASOS',
  'screen-users': 'USUARIOS DEL SISTEMA',
}

const ROLE_BADGE_CLASS: Record<Usuario['tipoUsuario'], string> = {
  ADMINISTRADOR: 'role-admin',
  CAPTURISTA: 'role-capturista',
  CONSULTA: 'role-consulta',
}

function vigenciaLabel(session: Usuario): string {
  const desde = formatFecha(session.vigenciaFini)
  const hasta = formatFecha(session.vigenciaFechafin)

  if (!desde && !hasta) return 'VIGENCIA: SIN LÍMITE'
  if (desde && hasta) return `VIGENCIA: ${desde} — ${hasta}`
  if (desde) return `VIGENCIA DESDE ${desde}`
  return `VIGENCIA HASTA ${hasta}`
}

export function UserContextBar({
  session,
  activeScreen,
  selectedPlant,
  onNavigate,
  onLogout,
}: UserContextBarProps) {
  // Scroll hacia abajo: la barra se oculta. Hacia arriba (o al inicio): vuelve.
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const DISTANCIA_MINIMA = 6
    const ZONA_SUPERIOR = 40
    let lastY = window.scrollY

    const onScroll = () => {
      const y = window.scrollY
      const delta = y - lastY
      lastY = y

      if (y <= ZONA_SUPERIOR) {
        setHidden(false)
        return
      }
      if (delta > DISTANCIA_MINIMA) setHidden(true)
      else if (delta < -DISTANCIA_MINIMA) setHidden(false)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Al cambiar de pantalla/planta la barra vuelve a mostrarse.
  // Ajuste durante el render (patrón "estado de renders previos") en lugar de un efecto.
  const contextKey = `${activeScreen}|${selectedPlant ?? ''}`
  const [prevContextKey, setPrevContextKey] = useState(contextKey)
  if (prevContextKey !== contextKey) {
    setPrevContextKey(contextKey)
    setHidden(false)
  }

  const screenLabel = session ? SCREEN_LABELS[activeScreen] : undefined
  const brandOnly = !session
  // El texto ya nombra la marca: el logo es decorativo.
  const brand = (
    <>
      <img src={logo} alt="" className="context-logo" />
      GRUPO ARMAS
    </>
  )
  const className = `context-bar${brandOnly ? ' brand-only' : ''}${hidden ? ' bar-hidden' : ''}`

  return (
    <header className={className}>
      {brandOnly ? (
        <span className="context-brand">{brand}</span>
      ) : (
        <button type="button" className="context-brand" onClick={() => onNavigate('screen-menu')}>
          {brand}
        </button>
      )}

      {session && screenLabel && (
        <nav className="context-path" aria-label="Pantalla actual">
          <span>{screenLabel}</span>
          {activeScreen === 'screen-transfer' && selectedPlant && (
            <>
              <span className="context-sep" aria-hidden="true">
                ›
              </span>
              <strong>{selectedPlant}</strong>
            </>
          )}
        </nav>
      )}

      {session && (
        <div className="context-user">
          <span className="context-name">{session.usuario}</span>
          <span className={`role-badge ${ROLE_BADGE_CLASS[session.tipoUsuario]}`}>
            {session.tipoUsuario}
          </span>
          <span className="context-vigencia">{vigenciaLabel(session)}</span>
          <button type="button" className="btn-red context-logout" onClick={onLogout}>
            SALIR
          </button>
        </div>
      )}
    </header>
  )
}
