import type { TurnosData } from '../types'

export interface MiembroRoster {
  id: string
  nombre: string
  datos: TurnosData
}

export type PlanillaCelda = 'D' | 'N' | 'DN' | 'V' | 'AD' | ''

export interface FilaPlanilla {
  miembroId: string
  nombre: string
  celdas: PlanillaCelda[]
}

export interface PlanillaMes {
  year: number
  month: number
  totalDias: number
  primerDiaSemana: number
  filas: FilaPlanilla[]
}

export function celdaDeDia(datos: TurnosData | undefined, year: number, month: number, day: number): PlanillaCelda {
  const d = datos?.[year]?.[month]?.[day]
  if (!d) return ''
  if (d.tipo === 'vacaciones') return 'V'
  if (d.tipo === 'administrativo') return 'AD'
  const t = d.turnos || []
  const ehNoche = t.includes('noche')
  const ehDia = t.includes('dia')
  if (ehNoche && ehDia) return 'DN'
  if (ehNoche) return 'N'
  if (ehDia) return 'D'
  return ''
}

// Matriz de turnos: filas = trabajadores (ordenados por nombre), columnas = días del mes
export function construirPlanilla(miembros: MiembroRoster[], year: number, month: number): PlanillaMes {
  const totalDias = new Date(year, month + 1, 0).getDate()
  const primerDiaSemana = new Date(year, month, 1).getDay()
  const filas: FilaPlanilla[] = [...miembros]
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map((m) => ({
      miembroId: m.id,
      nombre: m.nombre,
      celdas: Array.from({ length: totalDias }, (_, i) => celdaDeDia(m.datos, year, month, i + 1)),
    }))
  return { year, month, totalDias, primerDiaSemana, filas }
}

// Quién trabaja cada día (turnos día/noche o presencia) — útil para el resumen impreso
export interface DiaResumen {
  dia: number
  numeros: number
  turnos: number
  conTurno: string[]
  numero: string[]
}

export function resumenPorDia(planilla: PlanillaMes): DiaResumen[] {
  const resumen: DiaResumen[] = Array.from({ length: planilla.totalDias }, (_, i) => ({
    dia: i + 1,
    numeros: 0,
    turnos: 0,
    conTurno: [],
    numero: [],
  }))
  for (const fila of planilla.filas) {
    fila.celdas.forEach((celda, i) => {
      if (!celda) return
      const nombre = fila.nombre.split(' ')[0] || fila.nombre
      resumen[i].conTurno.push(fila.nombre)
      resumen[i].numero.push(nombre)
      if (celda === 'D' || celda === 'N' || celda === 'DN') resumen[i].turnos++
    })
  }
  return resumen
}