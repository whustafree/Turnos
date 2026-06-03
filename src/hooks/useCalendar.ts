import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  saveLocalData,
  loadLocalData,
  defaultPerfil,
  calcularTurnoOriginal,
  aplicarCiclo,
  calcularDashboardStats,
  agruparAusencias,
} from '../lib/turnos'
import { useOfflineSync } from './useOfflineSync'
import type { TurnoTipo, TurnosData, PatronCiclo } from '../types'
import type { AusenciaGroup } from '../lib/turnos'

interface PerfilData {
  nombre: string
  cargo: string
  empresa: string
  adminTotal: number
  vacacionesLey: number
  vacacionesSindicato: number
  vacacionesTotal: number
  patronActual: PatronCiclo | null
}

export function useCalendar(userId: string | undefined) {
  const [turnos, setTurnos] = useState<TurnosData>({})
  const [perfil, setPerfil] = useState<PerfilData>(defaultPerfil())
  const [activeTab, setActiveTab] = useState<'calendario' | 'planificar' | 'ausencias' | 'administrador'>('calendario')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showTurnoModal, setShowTurnoModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const { isOnline, queueSync } = useOfflineSync(userId)

  useEffect(() => {
    const local = loadLocalData()
    if (local) {
      setTurnos(local.turnos || {})
      setPerfil(local.perfil || defaultPerfil())
    }
  }, [])

  useEffect(() => {
    if (!userId) return
    supabase
      .from('usuarios_turnos')
      .select('datos_turnos, datos_perfil')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return
        if (data) {
          setTurnos((data.datos_turnos as TurnosData) || {})
          if (data.datos_perfil) {
            setPerfil((prev) => ({
              ...prev,
              ...(data.datos_perfil as Partial<PerfilData>),
            }))
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
            if (error) console.error('Error syncing to cloud:', error)
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
      setPerfil((prev) => ({ ...prev, patronActual: newPatron }))
      setTurnos((prev) => {
        const newTurnos = aplicarCiclo(prev, year, month, newPatron)
        const newPerfil = { ...perfil, patronActual: newPatron }
        persist(newTurnos, newPerfil)
        return newTurnos
      })
    },
    [persist, perfil]
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
    saveVacaciones,
    eliminarPeriodo,
    applyCiclo,
    saveProfile,
    openDay,
    getDashboardStats,
    getAusencias,
    importData,
    isOnline,
  }
}
