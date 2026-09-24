import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    const esEnlaceRecuperacion =
      window.location.hash.includes('type=recovery') ||
      window.location.hash.includes('type=RECOVERY')

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (esEnlaceRecuperacion) setPasswordRecovery(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    // redirectTo a la raíz: los tokens de recuperación viajan en el hash de la URL,
    // así que no hacen falta rutas extra en la SPA.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://turnos-chile.vercel.app/',
    })
    if (error) throw error
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }, [])

  const completePasswordRecovery = useCallback(() => {
    setPasswordRecovery(false)
    if (window.location.hash.includes('type=recovery') || window.location.hash.includes('type=RECOVERY')) {
      const clean = window.location.origin + window.location.pathname + window.location.search
      window.history.replaceState(null, '', clean)
    }
  }, [])

  const logout = useCallback(async () => {
    localStorage.removeItem('turnos_local_data')
    localStorage.removeItem('turnos_pending_ops')
    await supabase.auth.signOut()
  }, [])

  const userId = user?.id

  return {
    user,
    loading,
    userId,
    passwordRecovery,
    login,
    signUp,
    resetPassword,
    updatePassword,
    completePasswordRecovery,
    logout,
  }
}
