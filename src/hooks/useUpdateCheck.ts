import { useEffect, useState, useCallback } from 'react'
import { isNative } from '../lib/native'

const REMOTE_TAGS_URL = 'https://api.github.com/repos/whustafree/Turnos/tags?per_page=50'
const CHECK_CACHE_KEY = 'turnos_update_check_cache'
const CHECK_CACHE_TTL = 6 * 60 * 60 * 1000

interface CachedCheck {
  ts: number
  latest: string
}

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

function readCache(): CachedCheck | null {
  try {
    const raw = localStorage.getItem(CHECK_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedCheck
    if (typeof parsed.ts !== 'number' || typeof parsed.latest !== 'string') return null
    if (Date.now() - parsed.ts > CHECK_CACHE_TTL) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(latest: string) {
  try {
    localStorage.setItem(CHECK_CACHE_KEY, JSON.stringify({ ts: Date.now(), latest } as CachedCheck))
  } catch {
    /* sin almacenamiento disponible */
  }
}

export function useUpdateCheck() {
  const [status, setStatus] = useState<UpdateStatus>({
    checking: true,
    available: false,
    current: '',
    latest: '',
    downloadUrl: '',
  })

  const runCheck = useCallback(async (force = false) => {
    setStatus((s) => ({ ...s, checking: true }))

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
      if (force) {
        localStorage.removeItem(CHECK_CACHE_KEY)
      }
      const cached = readCache()
      if (cached) {
        latest = cached.latest
      } else {
        const remoteRes = await fetch(REMOTE_TAGS_URL, { cache: 'no-store' })
        if (remoteRes.ok) {
          const tags = (await remoteRes.json()) as { name: string }[]
          const versions = tags
            .map((t) => t.name)
            .filter((n) => /^0\.\d+$/.test(n))
          if (versions.length > 0) {
            versions.sort((a, b) => compareVersions(b, a))
            latest = versions[0]
          }
          writeCache(latest)
        }
      }
      downloadUrl = `https://github.com/whustafree/Turnos/releases/download/apk-latest/TurnosApp-Debug.apk`
    } catch {
      /* sin conexión o sin release aún */
    }

    setStatus({
      checking: false,
      available: isNative() && latest !== '' && compareVersions(latest, current) > 0,
      current,
      latest,
      downloadUrl,
    })
  }, [])

  useEffect(() => {
    runCheck()
  }, [runCheck])

  return { ...status, refreshVersion: () => runCheck(true) }
}