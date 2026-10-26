import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'grupoarmas-theme'

function isTheme(value: string | null): value is Theme {
  return value === 'dark' || value === 'light'
}

/** Tema guardado en el navegador, o en su defecto el del sistema operativo. */
function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isTheme(stored)) return stored
  } catch {
    // localStorage puede no estar disponible (modo privado, política del navegador).
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/**
 * Alterna entre el tema oscuro y el claro.
 * La preferencia se guarda en el navegador y se aplica como atributo
 * `data-theme` en <html>, que es lo que usan los tokens de App.css.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readStoredTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme

    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Si no se puede guardar, el tema sigue funcionando durante la sesión.
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggleTheme }
}
