import type { TurnoTipo, PatronCiclo, DiaTurno, TurnosData } from '../types'
import { CICLOS_3X3 } from '../types'
import { esDiaHabil } from './feriados'

// ─── Storage Keys ───
const STORAGE_KEY = 'turnos_local_data'
const OLD_STORAGE_KEY = 'turnos'
const OLD_PERFIL_KEY = 'turnos_perfil'
const THEME_KEY = 'theme'

// ─── Local Data Shape ───
interface LocalData {
  turnos: TurnosData
  perfil: {
    nombre: string
    cargo: string
    empresa: string
    adminTotal: number
    vacacionesLey: number
    vacacionesSindicato: number
    vacacionesTotal: number
    patronActual: PatronCiclo | null
    mesesBorrados: string[]
  }
  timestamp: number
}

// ─── Save / Load from LocalStorage ───
export function saveLocalData(turnos: TurnosData, perfil: LocalData['perfil']) {
  try {
    const data: LocalData = { turnos, perfil, timestamp: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Error saving local data:', e)
  }
}

// ─── Migrate from old storage format (vanilla JS) ───
function migrarDatosViejos(): { turnos: TurnosData; perfil: LocalData['perfil'] } | null {
  try {
    const oldTurnos = localStorage.getItem(OLD_STORAGE_KEY)
    const oldPerfil = localStorage.getItem(OLD_PERFIL_KEY)
    if (!oldTurnos && !oldPerfil) return null

    const turnos: TurnosData = oldTurnos ? JSON.parse(oldTurnos) : {}
    const perfil = oldPerfil ? { ...defaultPerfil(), ...JSON.parse(oldPerfil) } : defaultPerfil()

    // Save in new format
    saveLocalData(turnos, perfil)

    // Remove old keys
    localStorage.removeItem(OLD_STORAGE_KEY)
    localStorage.removeItem(OLD_PERFIL_KEY)

    console.log('✅ Datos migrados del formato antiguo al nuevo')
    return { turnos, perfil }
  } catch {
    return null
  }
}

export function loadLocalData(): { turnos: TurnosData; perfil: LocalData['perfil'] } | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed: LocalData = JSON.parse(stored)
      return { turnos: parsed.turnos || {}, perfil: parsed.perfil || defaultPerfil() }
    }
    // Try to migrate from old format
    return migrarDatosViejos()
  } catch {
    return null
  }
}

export function defaultPerfil(): LocalData['perfil'] {
  return {
    nombre: 'Usuario',
    cargo: '',
    empresa: '',
    adminTotal: 6,
    vacacionesLey: 15,
    vacacionesSindicato: 2,
    vacacionesTotal: 17,
    patronActual: null,
    mesesBorrados: [],
  }
}

// ─── Theme ───
export function loadTheme(): 'light' | 'dark' {
  return (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'light'
}

export function saveTheme(theme: 'light' | 'dark') {
  localStorage.setItem(THEME_KEY, theme)
}

// ─── Diferencia de días a prueba de horario de verano ───
// Normaliza a mediodía UTC usando los campos de fecha LOCAL para que
// los días de transición DST (23h/25h) no generen off-by-one.
function diffDias(fecha: Date, base: Date): number {
  const utcFecha = Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  const utcBase = Date.UTC(base.getFullYear(), base.getMonth(), base.getDate())
  return Math.round((utcFecha - utcBase) / (1000 * 60 * 60 * 24))
}

// ─── Cálculo de Turno Original ───
export function calcularTurnoOriginal(
  fecha: Date,
  patronActual: PatronCiclo | null
): TurnoTipo | null {
  if (!patronActual) return null
  const { fechaInicio, cicloId } = patronActual
  const patronTrabajo = CICLOS_3X3[cicloId]
  if (!patronTrabajo || patronTrabajo.length === 0) return null

  const [iy, im, id] = fechaInicio.split('-').map(Number)
  const startDate = new Date(iy, im - 1, id)
  if (fecha < startDate) return null

  const periodo = patronTrabajo.length
  const pos = ((diffDias(fecha, startDate) % periodo) + periodo) % periodo
  const paso = patronTrabajo[pos]
  if (paso === 'descanso') return null
  return paso
}

// ─── Aplicar Ciclo 3x3 ───
export function aplicarCiclo(
  turnos: TurnosData,
  year: number,
  month: number,
  patronActual: PatronCiclo
): TurnosData {
  const newTurnos = { ...turnos }
  const patronTrabajo = CICLOS_3X3[patronActual.cicloId]
  if (!patronTrabajo || patronTrabajo.length === 0) return newTurnos

  const [iy, im, id] = patronActual.fechaInicio.split('-').map(Number)
  const startDate = new Date(iy, im - 1, id)
  const diasMes = new Date(year, month + 1, 0).getDate()
  const periodo = patronTrabajo.length

  if (!newTurnos[year]) newTurnos[year] = {}
  if (!newTurnos[year][month]) newTurnos[year][month] = {}

  for (let d = 1; d <= diasMes; d++) {
    const currentDate = new Date(year, month, d)
    if (currentDate < startDate) continue

    const diffDays = diffDias(currentDate, startDate)
    const pos = ((diffDays % periodo) + periodo) % periodo
    const paso = patronTrabajo[pos]

    const existing = newTurnos[year][month][d]
    // No sobrescribir vacaciones ni administrativos (aprobados o pendientes)
    if (existing && existing.tipo !== 'turno') continue

    if (paso === 'descanso') {
      if (existing?.tipo === 'turno') delete newTurnos[year][month][d]
    } else {
      newTurnos[year][month][d] = {
        turnos: [paso],
        tipo: 'turno',
      }
    }
  }

  return newTurnos
}

// ─── Obtener el día visible (guardado o auto-generado por el patrón 3x3) ───
export function obtenerDia(
  turnos: TurnosData,
  year: number,
  month: number,
  day: number,
  patronActual: PatronCiclo | null,
  mesesBorrados?: string[]
): DiaTurno | undefined {
  const stored = turnos[year]?.[month]?.[day]
  if (stored) return stored
  if (mesesBorrados?.includes('*') || mesesBorrados?.includes(`${year}-${month}`)) return undefined
  const auto = calcularTurnoOriginal(new Date(year, month, day), patronActual)
  if (auto) return { turnos: [auto], tipo: 'turno' }
  return undefined
}

// ─── Dashboard Stats ───
export function calcularDashboardStats(
  turnos: TurnosData,
  year: number,
  perfil: { adminTotal: number; vacacionesLey: number; vacacionesSindicato: number; vacacionesTotal: number }
) {
  let adminUsados = 0
  let vacUsados = 0

  if (turnos[year]) {
    Object.keys(turnos[year]).forEach((m) => {
      Object.keys(turnos[year][Number(m)]).forEach((d) => {
        const diaData = turnos[year][Number(m)][Number(d)]
        const fecha = new Date(year, Number(m), Number(d))
        if (diaData.tipo === 'administrativo') adminUsados++
        if (diaData.tipo === 'vacaciones') {
          if (esDiaHabil(fecha)) vacUsados++
        }
      })
    })
  }

  return {
    adminUsados,
    adminTotal: perfil.adminTotal,
    vacacionesUsadas: vacUsados,
    vacacionesLey: perfil.vacacionesLey,
    vacacionesSindicato: perfil.vacacionesSindicato,
    vacacionesTotal: perfil.vacacionesTotal,
  }
}

// ─── Estadísticas anuales de turnos ───
export interface StatsAnuales {
  dias: number
  noches: number
  extrasDia: number
  extrasNoche: number
  diasTrabajados: number
  vacaciones: number
  administrativos: number
}

export function calcularStatsAnuales(turnos: TurnosData, year: number): StatsAnuales {
  const s: StatsAnuales = {
    dias: 0,
    noches: 0,
    extrasDia: 0,
    extrasNoche: 0,
    diasTrabajados: 0,
    vacaciones: 0,
    administrativos: 0,
  }

  if (!turnos[year]) return s

  Object.keys(turnos[year]).forEach((m) => {
    Object.keys(turnos[year][Number(m)]).forEach((d) => {
      const dia = turnos[year][Number(m)][Number(d)]
      if (dia.tipo === 'vacaciones') s.vacaciones++
      else if (dia.tipo === 'administrativo') s.administrativos++
      else if (dia.turnos) {
        for (const t of dia.turnos) {
          if (t === 'dia') s.dias++
          else if (t === 'noche') s.noches++
          else if (t === 'extra-dia') s.extrasDia++
          else if (t === 'extra-noche') s.extrasNoche++
        }
        if (dia.turnos.some((t) => t === 'dia' || t === 'noche')) s.diasTrabajados++
      }
    })
  })

  return s
}

// ─── Agrupar Ausencias ───
export interface AusenciaGroup {
  inicio: Date
  fin: Date
  tipo: 'vacaciones' | 'administrativo'
  diasHabiles: number
}

export function agruparAusencias(turnos: TurnosData, year: number): AusenciaGroup[] {
  const items: { fecha: Date; tipo: 'vacaciones' | 'administrativo' }[] = []

  if (turnos[year]) {
    Object.keys(turnos[year]).forEach((m) => {
      Object.keys(turnos[year][Number(m)]).forEach((d) => {
        const data = turnos[year][Number(m)][Number(d)]
        if (data.tipo === 'vacaciones' || data.tipo === 'administrativo') {
          items.push({ fecha: new Date(year, Number(m), Number(d)), tipo: data.tipo })
        }
      })
    })
  }

  if (items.length === 0) return []

  items.sort((a, b) => a.fecha.getTime() - b.fecha.getTime())

  const grupos: AusenciaGroup[] = []
  let grupoActual = [items[0]]

  for (let i = 1; i < items.length; i++) {
    const diff =
      (items[i].fecha.getTime() - grupoActual[grupoActual.length - 1].fecha.getTime()) /
      (1000 * 60 * 60 * 24)
    if (Math.round(diff) === 1 && items[i].tipo === items[i - 1].tipo) {
      grupoActual.push(items[i])
    } else {
      const inicio = grupoActual[0].fecha
      const fin = grupoActual[grupoActual.length - 1].fecha
      let habiles = 0
      let loop = new Date(inicio)
      while (loop <= fin) {
        if (esDiaHabil(loop)) habiles++
        loop.setDate(loop.getDate() + 1)
      }
      grupos.push({ inicio, fin, tipo: grupoActual[0].tipo, diasHabiles: habiles })
      grupoActual = [items[i]]
    }
  }

  // Last group
  const inicio = grupoActual[0].fecha
  const fin = grupoActual[grupoActual.length - 1].fecha
  let habiles = 0
  let loop = new Date(inicio)
  while (loop <= fin) {
    if (esDiaHabil(loop)) habiles++
    loop.setDate(loop.getDate() + 1)
  }
  grupos.push({ inicio, fin, tipo: grupoActual[0].tipo, diasHabiles: habiles })

  return grupos
}

// ─── Exportar datos como JSON ───
export function exportarJSON(
  turnos: TurnosData,
  perfil: LocalData['perfil']
): string {
  const data = {
    version: '2.0',
    exportado: new Date().toISOString(),
    turnos,
    perfil,
  }
  return JSON.stringify(data, null, 2)
}

// ─── Exportar datos como CSV ───
export function exportarCSV(turnos: TurnosData, year: number): string {
  const lines: string[] = ['Fecha,Tipo,Estado,Detalle']

  if (turnos[year]) {
    Object.keys(turnos[year]).forEach((m) => {
      Object.keys(turnos[year][Number(m)]).forEach((d) => {
        const data = turnos[year][Number(m)][Number(d)]
        const fecha = `${year}-${String(Number(m) + 1).padStart(2, '0')}-${String(Number(d)).padStart(2, '0')}`
        const detalle = data.turnos?.join(' | ') || ''
        lines.push(
          `${fecha},${data.tipo},${data.estado || ''},"${detalle}"`
        )
      })
    })
  }

  return lines.join('\n')
}

// ─── Importar datos desde JSON ───
export function importarJSON(jsonStr: string): {
  turnos: TurnosData
  perfil: LocalData['perfil']
} | null {
  try {
    const data = JSON.parse(jsonStr)
    if (!data.turnos || !data.perfil) return null
    return { turnos: data.turnos, perfil: data.perfil }
  } catch {
    return null
  }
}

// ─── Generar texto de carta de vacaciones ───
export function generarCartaVacaciones(
  startDate: Date,
  endDate: Date,
  nombre: string
): string {
  let habiles = 0
  let loop = new Date(startDate)
  while (loop <= endDate) {
    if (esDiaHabil(loop)) habiles++
    loop.setDate(loop.getDate() + 1)
  }

  return (
    `Estimada Jefatura,\n\n` +
    `Solicito feriado legal del ${startDate.toLocaleDateString('es-CL')} al ${endDate.toLocaleDateString('es-CL')}.\n` +
    `Total: ${habiles} días hábiles.\n\n` +
    `Atte,\n${nombre || 'Colaborador'}`
  )
}
