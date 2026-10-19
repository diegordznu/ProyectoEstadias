import { useEffect, useRef } from 'react'

/** Cierra un popover al hacer clic fuera del elemento que recibe el ref. */
export function useClickOutside(open: boolean, setOpen: (open: boolean) => void) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleOutside = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [open, setOpen])

  return ref
}
