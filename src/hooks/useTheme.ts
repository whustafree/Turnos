import { useState, useEffect, useCallback } from 'react'
import { loadTheme, saveTheme } from '../lib/turnos'

export function useTheme() {
  const [isDark, setIsDark] = useState(() => loadTheme() === 'dark')

  useEffect(() => {
    if (isDark) {
      document.body.setAttribute('data-theme', 'dark')
    } else {
      document.body.removeAttribute('data-theme')
    }
  }, [isDark])

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev
      saveTheme(next ? 'dark' : 'light')
      return next
    })
  }, [])

  return { isDark, toggle }
}
