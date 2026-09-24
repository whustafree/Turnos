import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  saveLocalData,
  loadLocalData,
  defaultPerfil,
  normalizarPerfil,
  calcularTurnoOriginal,
  aplicarCiclo,
  calcularDashboardStats,
  agruparAusencias,
} from '../lib/turnos'
import { setCiclosPersonalizados } from '../types'
import { useOfflineSync } from './useOfflineSync'
import type { TurnoTipo, TurnosData, DiaTurno, PatronCiclo, CicloPaso, CicloPersonalizado } from '../types'
import type { AusenciaGroup } from '../lib/turnos'
import { getPendingOps } from './useOfflineSync'

interface PerfilData {
  nombre: string
  cargo: string
  empresa: string
  adminTotal: number
  vacacionesLey: number
  vacacionesSindicato: number
  vacacionesTotal: number
  patronActual: PatronCiclo | null
  patrones: PatronCiclo[]
  mesesBorrados: string[]
  customCiclos?: Record<string, CicloPersonalizado>
}

// ─── Normalizar datos del formato antiguo (vanilla JS) al nuevo ───
function normalizarDatosTurnos(raw: Record<string, Record<string, Record<string, any>>>): TurnosData {
  const result: TurnosData = {}
  for (const y of Object.keys(raw)) {
    const year = Number(y)
    result[year] = {}
    for (const m of Object.keys(raw[year])) {
      const month = Number(m)
      result[year][month] = {}
      for (const d of Object.keys(raw[year][month])) {
        const day = Number(d)
        const entrada: any = raw[year][month][d]
        if (!entrada || !entrada.turnos || !Array.isArray(entrada.turnos)) continue

        const turnosRaw = entrada.turnos as string[]
        let tipo = entrada.tipo as DiaTurno['tipo'] | undefined
        let turnos = turnosRaw
        let estado = entrada.estado
        let locked = entrada.locked

        // Detectar tipo por el contenido de turnos si no hay tipo explícito
        if (!tipo) {
          const hasWork = turnosRaw.some((t) => ['dia', 'noche', 'tarde', 'madrugada'].includes(t))
          const hasExtra = turnosRaw.some((t) => t.startsWith('extra-'))
          if (hasWork || hasExtra) {
            tipo = 'turno'
          }
        }

        // Normalizar "Admin" → "administrativo" con turnos ['dia']
        if (turnosRaw.includes('Admin')) {
          tipo = 'administrativo'
          turnos = ['dia']
          locked = true
        }

        // Normalizar "VAC" → "vacaciones" con turnos ['dia']
        if (turnosRaw.includes('VAC')) {
          tipo = 'vacaciones'
          turnos = ['dia']
        }

        // Si no se pudo determinar tipo, ignorar
        if (!tipo) continue

        result[year][month][day] = {
          turnos: turnos as TurnoTipo[],
          tipo,
          ...(estado ? { estado } : {}),
          ...(locked ? { locked } : {}),
        }
      }
    }
  }
  return result
}

export function useCalendar(userId: string | undefined) {
  const [turnos, setTurnos] = useState<TurnosData>({})
  const [perfil, setPerfil] = useState<PerfilData>(defaultPerfil())
  const [activeTab, setActiveTab] = useState<'calendario' | 'planificar' | 'ausencias' | 'administrador' | 'equipo'>('calendario')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showTurnoModal, setShowTurnoModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const { isOnline, queueSync } = useOfflineSync(userId)

  useEffect(() => {
    const local = loadLocalData()
    if (local) {
      setTurnos(local.turnos || {})
      setPerfil(normalizarPerfil(local.perfil || defaultPerfil()))
    }
  }, [])

  // Mantiene el registro de ciclos personalizados sincronizado con el perfil
  useEffect(() => {
    setCiclosPersonalizados(perfil.customCiclos)
  }, [perfil.customCiclos])

  useEffect(() => {
    if (!userId) return
    // Si hay cambios sin sincronizar en local, la nube está desactualizada:
    // el re-sync de useOfflineSync subirá lo local al conectarse.
    // Saltarse el fetch evita sobreescribir el estado con datos viejos (race).
    if (getPendingOps().length > 0) return
    supabase
      .from('usuarios_turnos')
      .select('datos_turnos, datos_perfil')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return
        if (data) {
          const raw = data.datos_turnos as Record<string, Record<string, Record<string, any>>>
          setTurnos(normalizarDatosTurnos(raw) || {})
          if (data.datos_perfil) {
            const cloudPerfil = data.datos_perfil as Partial<PerfilData>
            setPerfil((prev) => normalizarPerfil({ ...prev, ...cloudPerfil }))
          }
        }
      })
  }, [userId])

  const persist = useCallback(
    (newTurnos: TurnosData, newPerfil: PerfilData) => {
      saveLocalData(newTurnos, newPerfil)
      if (userId) {
        if (navigator.onLine) {
          supabase.from('usuarios_turnos').upsert(
            {
              user_id: userId,
              datos_turnos: newTurnos,
              datos_perfil: newPerfil,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          ).then(({ error }) => {
            if (error) {
              console.error('Error syncing to cloud:', error)
              setSyncError('No se pudo guardar en la nube. Tus datos están a salvo en este dispositivo.')
            } else {
              setSyncError(null)
            }
          })
        } else {
          queueSync()
        }
      }
    },
    [userId, queueSync]
  )

  const addTurno = useCallback(
    (year: number, month: number, day: number, tipo: TurnoTipo) => {
      setTurnos((prev) => {
        const newTurnos = structuredClone(prev)
        if (!newTurnos[year]) newTurnos[year] = {}
        if (!newTurnos[year][month]) newTurnos[year][month] = {}
        const existing = newTurnos[year][month][day]
        let current: TurnoTipo[] = []
        if (existing?.tipo === 'turno') current = existing.turnos
        if (!current.includes(tipo)) current.push(tipo)
        newTurnos[year][month][day] = { turnos: current, tipo: 'turno' }
        persist(newTurnos, perfil)
        return newTurnos
      })
    },
    [persist, perfil]
  )

  const marcarAdmin = useCallback(
    (year: number, month: number, day: number) => {
      setTurnos((prev) => {
        const newTurnos = structuredClone(prev)
        if (!newTurnos[year]) newTurnos[year] = {}
        if (!newTurnos[year][month]) newTurnos[year][month] = {}
        newTurnos[year][month][day] = {
          turnos: ['dia' as TurnoTipo],
          tipo: 'administrativo',
          estado: 'aprobado',
          locked: true,
        }
        persist(newTurnos, perfil)
        return newTurnos
      })
    },
    [persist, perfil]
  )

  const removeTurno = useCallback(
    (year: number, month: number, day: number) => {
      setTurnos((prev) => {
        const newTurnos = structuredClone(prev)
        if (newTurnos[year]?.[month]?.[day]) {
          delete newTurnos[year][month][day]
        }
        persist(newTurnos, perfil)
        return newTurnos
      })
    },
    [persist, perfil]
  )

  const clearMonth = useCallback(
    (year: number, month: number) => {
      const key = `${year}-${month}`
      const newPerfil: PerfilData = {
        ...perfil,
        mesesBorrados: perfil.mesesBorrados?.includes(key)
          ? perfil.mesesBorrados
          : [...(perfil.mesesBorrados || []), key],
      }
      setPerfil(newPerfil)
      setTurnos((prev) => {
        const newTurnos = structuredClone(prev)
        if (newTurnos[year]) {
          delete newTurnos[year][month]
        }
        persist(newTurnos, newPerfil)
        return newTurnos
      })
    },
    [persist, perfil]
  )

  const clearAll = useCallback(() => {
    const empty: TurnosData = {}
    // '*' marca todos los meses como borrados para que el patrón no los repinte
    const newPerfil: PerfilData = { ...perfil, mesesBorrados: ['*'] }
    setPerfil(newPerfil)
    setTurnos(empty)
    persist(empty, newPerfil)
  }, [persist, perfil])

  const saveVacaciones = useCallback(
    (startDate: Date, endDate: Date, aprobado: boolean) => {
      setTurnos((prev) => {
        const newTurnos = structuredClone(prev)
        const loop = new Date(startDate)
        while (loop <= endDate) {
          const cy = loop.getFullYear()
          const cm = loop.getMonth()
          const cd = loop.getDate()
          if (!newTurnos[cy]) newTurnos[cy] = {}
          if (!newTurnos[cy][cm]) newTurnos[cy][cm] = {}
          newTurnos[cy][cm][cd] = {
            turnos: ['dia' as TurnoTipo],
            tipo: 'vacaciones',
            estado: aprobado ? 'aprobado' : 'pendiente',
            locked: aprobado,
          }
          loop.setDate(loop.getDate() + 1)
        }
        persist(newTurnos, perfil)
        return newTurnos
      })
    },
    [persist, perfil]
  )

  const eliminarPeriodo = useCallback(
    (inicioStr: string, finStr: string) => {
      const [yi, mi, di] = inicioStr.split('-').map(Number)
      const [yf, mf, df] = finStr.split('-').map(Number)
      const start = new Date(yi, mi - 1, di)
      const end = new Date(yf, mf - 1, df)
      setTurnos((prev) => {
        const newTurnos = structuredClone(prev)
        const loop = new Date(start)
        while (loop <= end) {
          const cy = loop.getFullYear()
          const cm = loop.getMonth()
          const cd = loop.getDate()
          const turnoOriginal = calcularTurnoOriginal(loop, perfil.patronActual)
          if (turnoOriginal) {
            if (!newTurnos[cy]) newTurnos[cy] = {}
            if (!newTurnos[cy][cm]) newTurnos[cy][cm] = {}
            newTurnos[cy][cm][cd] = { turnos: [turnoOriginal], tipo: 'turno' }
          } else if (newTurnos[cy]?.[cm]?.[cd]) {
            delete newTurnos[cy][cm][cd]
          }
          loop.setDate(loop.getDate() + 1)
        }
        persist(newTurnos, perfil)
        return newTurnos
      })
    },
    [persist, perfil]
  )

  const applyCiclo = useCallback(
    (fechaInicio: string, cicloId: string, year: number, month: number) => {
      const newPatron: PatronCiclo = { fechaInicio, cicloId }
      // Guarda el ciclo en la lista de patrones (multiples ciclos activos)
      const existe = (perfil.patrones || []).some(
        (p) => p.fechaInicio === fechaInicio && p.cicloId === cicloId
      )
      const patrones = existe
        ? perfil.patrones
        : [...(perfil.patrones || []), newPatron]
      // Al regenerar un mes, el patrón vuelve a mostrarse ahí (se quita '*' y el mes concreto)
      const newPerfil: PerfilData = {
        ...perfil,
        patronActual: newPatron,
        patrones,
        mesesBorrados: (perfil.mesesBorrados || []).filter(
          (k) => k !== '*' && k !== `${year}-${month}`
        ),
      }
      setPerfil(newPerfil)
      setTurnos((prev) => {
        const newTurnos = aplicarCiclo(prev, year, month, newPatron)
        persist(newTurnos, newPerfil)
        return newTurnos
      })
    },
    [persist, perfil]
  )

  const switchPatron = useCallback(
    (patron: PatronCiclo) => {
      const newPerfil: PerfilData = { ...perfil, patronActual: patron }
      setPerfil(newPerfil)
      persist(turnos, newPerfil)
    },
    [persist, perfil, turnos]
  )

  const eliminarPatron = useCallback(
    (patron: PatronCiclo) => {
      const patrones = (perfil.patrones || []).filter(
        (p) => !(p.fechaInicio === patron.fechaInicio && p.cicloId === patron.cicloId)
      )
      const esActivo =
        perfil.patronActual &&
        perfil.patronActual.fechaInicio === patron.fechaInicio &&
        perfil.patronActual.cicloId === patron.cicloId
      const newPerfil: PerfilData = {
        ...perfil,
        patrones,
        patronActual: esActivo ? (patrones[0] ?? null) : perfil.patronActual,
      }
      setPerfil(newPerfil)
      persist(turnos, newPerfil)
    },
    [persist, perfil, turnos]
  )

  const saveProfile = useCallback(
    (data: Partial<PerfilData>) => {
      setPerfil((prev) => {
        const newPerfil = { ...prev, ...data }
        persist(turnos, newPerfil)
        return newPerfil
      })
    },
    [persist, turnos]
  )

  const saveCustomCiclo = useCallback(
    (id: string, ciclo: CicloPersonalizado) => {
      setPerfil((prev) => {
        const customCiclos = { ...(prev.customCiclos || {}), [id]: ciclo }
        const newPerfil = { ...prev, customCiclos }
        persist(turnos, newPerfil)
        return newPerfil
      })
    },
    [persist, turnos]
  )

  const deleteCustomCiclo = useCallback(
    (id: string) => {
      setPerfil((prev) => {
        const customCiclos = { ...(prev.customCiclos || {}) }
        delete customCiclos[id]
        const newPerfil = { ...prev, customCiclos }
        // Si el ciclo eliminado era el activo, pasar a otro
        if (prev.patronActual?.cicloId === id) {
          const remanente = (prev.patrones || []).filter((p) => p.cicloId !== id)
          newPerfil.patronActual = remanente[0] ?? null
          newPerfil.patrones = remanente
        }
        persist(turnos, newPerfil)
        return newPerfil
      })
    },
    [persist, turnos]
  )

  const openDay = useCallback(
    (day: number) => {
      setSelectedDay(day)
      setShowTurnoModal(true)
    },
    []
  )

  const getDashboardStats = useCallback(
    (year: number) => {
      return calcularDashboardStats(turnos, year, {
        adminTotal: perfil.adminTotal,
        vacacionesLey: perfil.vacacionesLey,
        vacacionesSindicato: perfil.vacacionesSindicato,
        vacacionesTotal: perfil.vacacionesTotal,
      })
    },
    [turnos, perfil.adminTotal, perfil.vacacionesLey, perfil.vacacionesSindicato, perfil.vacacionesTotal]
  )

  const getAusencias = useCallback(
    (year: number): AusenciaGroup[] => {
      return agruparAusencias(turnos, year)
    },
    [turnos]
  )

  const importData = useCallback(
    (newTurnos: TurnosData, newPerfil: PerfilData) => {
      setTurnos(newTurnos)
      setPerfil(newPerfil)
      persist(newTurnos, newPerfil)
    },
    [persist]
  )

  return {
    turnos,
    setTurnos,
    perfil,
    activeTab,
    setActiveTab,
    selectedDay,
    setSelectedDay,
    showTurnoModal,
    setShowTurnoModal,
    showProfileModal,
    setShowProfileModal,
    addTurno,
    marcarAdmin,
    removeTurno,
    clearMonth,
    clearAll,
    saveVacaciones,
    eliminarPeriodo,
    applyCiclo,
    switchPatron,
    eliminarPatron,
    saveProfile,
    saveCustomCiclo,
    deleteCustomCiclo,
    openDay,
    getDashboardStats,
    getAusencias,
    importData,
    isOnline,
    syncError,
  }
}
