import { useEffect, useState } from 'react'
import { isNative } from '../lib/native'

const REMOTE_VERSION_URL = 'https://github.com/whustafree/Turnos/releases/download/apk-latest/version.json'

export interface UpdateStatus {
  checking: boolean
  available: boolean
  current: string
  latest: string
  downloadUrl: string
}

export function compareVersions(a: string, b: string): number {
  const pa = (a || '0').split('.').map((n) => parseInt(n, 10) || 0)
  const pb = (b || '0').split('.').map((n) => parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x !== y) return x - y
  }
  return 0
}

export function useUpdateCheck(): UpdateStatus {
  const [status, setStatus] = useState<UpdateStatus>({
    checking: true,
    available: false,
    current: '',
    latest: '',
    downloadUrl: '',
  })

  useEffect(() => {
    let cancelled = false

    const checkUpdate = async () => {
      let current = '0.0'
      try {
        const localRes = await fetch('version.json', { cache: 'no-store' })
        if (localRes.ok) {
          const local = await localRes.json()
          current = local.version || '0.0'
        }
      } catch {
        /* versión local no disponible */
      }

      let latest = ''
      let downloadUrl = ''
      try {
        const remoteRes = await fetch(REMOTE_VERSION_URL, { cache: 'no-store' })
        if (remoteRes.ok) {
          const remote = await remoteRes.json()
          latest = remote.version || ''
        }
        downloadUrl = `https://github.com/whustafree/Turnos/releases/download/apk-latest/TurnosApp-Debug.apk`
      } catch {
        /* sin conexión o sin release aún */
      }

      if (cancelled) return
      setStatus({
        checking: false,
        available: isNative() && latest !== '' && compareVersions(latest, current) > 0,
        current,
        latest,
        downloadUrl,
      })
    }

    checkUpdate()
    return () => {
      cancelled = true
    }
  }, [])

  return status
}