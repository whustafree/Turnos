import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { loadLocalData, saveLocalData } from '../lib/turnos'
import type { TurnosData, PatronCiclo } from '../types'

interface PendingOperation {
  id: string
  type: 'sync_all'
  timestamp: number
}

const PENDING_KEY = 'turnos_pending_ops'

function getPendingOps(): PendingOperation[] {
  try {
    const data = localStorage.getItem(PENDING_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function addPendingOp(op: PendingOperation) {
  const ops = getPendingOps()
  ops.push(op)
  localStorage.setItem(PENDING_KEY, JSON.stringify(ops))
}

function clearPendingOps() {
  localStorage.removeItem(PENDING_KEY)
}

export function useOfflineSync(userId: string | undefined) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const lastOnlineRef = useRef(navigator.onLine)

  // ─── Monitor online/offline ───
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true)
      lastOnlineRef.current = true
    }
    const goOffline = () => {
      setIsOnline(false)
      lastOnlineRef.current = false
    }

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // ─── Re-sync when coming back online ───
  useEffect(() => {
    if (!isOnline || !userId) return

    const pending = getPendingOps()
    if (pending.length === 0) return

    // Re-sync local data to Supabase
    const local = loadLocalData()
    if (local) {
      supabase
        .from('usuarios_turnos')
        .upsert(
          {
            user_id: userId,
            datos_turnos: local.turnos,
            datos_perfil: local.perfil,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .then(({ error }) => {
          if (error) {
            console.error('Offline re-sync failed:', error)
            return
          }
          clearPendingOps()
          console.log('✅ Offline data re-synced to cloud')
        })
    }
  }, [isOnline, userId])

  // ─── Call this when saving data while offline ───
  const queueSync = useCallback(() => {
    if (!userId) return
    const op: PendingOperation = {
      id: `sync_${Date.now()}`,
      type: 'sync_all',
      timestamp: Date.now(),
    }
    addPendingOp(op)
  }, [userId])

  return {
    isOnline,
    queueSync,
    hasPendingSync: getPendingOps().length > 0,
  }
}
