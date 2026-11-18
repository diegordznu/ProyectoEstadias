import { useEffect, useEffectEvent, useState } from 'react'
import { ApiError } from '../api/client'

type RemoteState<T> = { key: string | null; data: T | null; error: string | null }

export type RemoteData<T> = {
  /** Datos de la clave actual (los anteriores siguen visibles mientras se recargan). */
  data: T | null
  error: string | null
  /** true mientras todavía no hay datos para la clave actual. */
  loading: boolean
}

/**
 * Carga datos de la API cada vez que `key` cambia o vuelve a activarse.
 * Con key = null no se carga nada (por ejemplo, cuando la pantalla no está visible).
 */
export function useRemoteData<T>(
  key: string | null,
  load: () => Promise<T>,
  onError?: (message: string) => void,
): RemoteData<T> {
  const [state, setState] = useState<RemoteState<T>>({ key: null, data: null, error: null })

  const start = useEffectEvent((requestKey: string, isCancelled: () => boolean) => {
    load()
      .then((data) => {
        if (!isCancelled()) setState({ key: requestKey, data, error: null })
      })
      .catch((error: unknown) => {
        if (isCancelled()) return
        const message = error instanceof ApiError ? error.message : 'NO SE PUDIERON CARGAR LOS DATOS'
        setState({ key: requestKey, data: null, error: message })
        onError?.(message)
      })
  })

  useEffect(() => {
    if (key === null) return
    let cancelled = false
    start(key, () => cancelled)
    return () => {
      cancelled = true
    }
  }, [key])

  const current = key !== null && state.key === key
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: key !== null && !current,
  }
}
