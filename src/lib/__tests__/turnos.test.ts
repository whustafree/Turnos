import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import {
  defaultPerfil,
  calcularDashboardStats,
  calcularTurnoOriginal,
  agruparAusencias,
  generarCartaVacaciones,
  saveLocalData,
  loadLocalData,
} from '../turnos'
import type { TurnosData, PatronCiclo } from '../../types'

// ─── LocalStorage Mock ───
const store: Record<string, string> = {}
beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k])
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
    length: 0,
    key: (_: number) => null,
  } as Storage
})

// ─── defaultPerfil ───
describe('defaultPerfil', () => {
  it('returns default values', () => {
    const perfil = defaultPerfil()
    expect(perfil.nombre).toBe('Usuario')
    expect(perfil.adminTotal).toBe(6)
    expect(perfil.vacacionesLey).toBe(15)
    expect(perfil.vacacionesSindicato).toBe(2)
    expect(perfil.vacacionesTotal).toBe(17)
    expect(perfil.patronActual).toBeNull()
  })
})

// ─── calcularDashboardStats ───
describe('calcularDashboardStats', () => {
  it('returns zeroes for empty data', () => {
    const stats = calcularDashboardStats({}, 2025, {
      adminTotal: 6,
      vacacionesLey: 15,
      vacacionesSindicato: 2,
      vacacionesTotal: 17,
    })
    expect(stats.adminUsados).toBe(0)
    expect(stats.vacacionesUsadas).toBe(0)
    expect(stats.adminTotal).toBe(6)
    expect(stats.vacacionesTotal).toBe(17)
  })

  it('counts admin days', () => {
    const turnos: TurnosData = {
      2025: {
        0: {
          10: { turnos: ['dia'], tipo: 'administrativo' },
          15: { turnos: ['dia'], tipo: 'administrativo' },
          20: { turnos: ['dia'], tipo: 'turno' }, // not admin
        },
      },
    }
    const stats = calcularDashboardStats(turnos, 2025, { adminTotal: 6, vacacionesLey: 15, vacacionesSindicato: 2, vacacionesTotal: 17 })
    expect(stats.adminUsados).toBe(2)
  })

  it('counts vacation weekdays only (no weekends)', () => {
    // January 6-10, 2025 = Monday to Friday (all weekdays)
    const turnos: TurnosData = {
      2025: {
        0: {
          6: { turnos: ['dia'], tipo: 'vacaciones' },
          7: { turnos: ['dia'], tipo: 'vacaciones' },
          8: { turnos: ['dia'], tipo: 'vacaciones' },
          9: { turnos: ['dia'], tipo: 'vacaciones' },
          10: { turnos: ['dia'], tipo: 'vacaciones' },
        },
      },
    }
    const stats = calcularDashboardStats(turnos, 2025, { adminTotal: 6, vacacionesLey: 15, vacacionesSindicato: 2, vacacionesTotal: 17 })
    expect(stats.vacacionesUsadas).toBe(5)
  })

  it('excludes weekends from vacation count', () => {
    // Saturday Jan 11 and Sunday Jan 12, 2025
    const turnos: TurnosData = {
      2025: {
        0: {
          11: { turnos: ['dia'], tipo: 'vacaciones' },
          12: { turnos: ['dia'], tipo: 'vacaciones' },
        },
      },
    }
    const stats = calcularDashboardStats(turnos, 2025, { adminTotal: 6, vacacionesLey: 15, vacacionesSindicato: 2, vacacionesTotal: 17 })
    expect(stats.vacacionesUsadas).toBe(0)
  })

  it('excludes Chilean holidays from vacation count', () => {
    // Wednesday Jan 1, 2025 = Año Nuevo (feriado), not a weekend
    const turnos: TurnosData = {
      2025: {
        0: {
          1: { turnos: ['dia'], tipo: 'vacaciones' },
        },
      },
    }
    const stats = calcularDashboardStats(turnos, 2025, { adminTotal: 6, vacacionesLey: 15, vacacionesSindicato: 2, vacacionesTotal: 17 })
    expect(stats.vacacionesUsadas).toBe(0)
  })
})

// ─── calcularTurnoOriginal ───
describe('calcularTurnoOriginal', () => {
  it('returns null without patron', () => {
    expect(calcularTurnoOriginal(new Date(), null)).toBeNull()
  })

  it('returns correct turno based on 3x3 cycle', () => {
    const patron: PatronCiclo = { fechaInicio: '2025-01-01', cicloId: '1' } // D-D-D
    const date = new Date(2025, 0, 1) // Wednesday Jan 1
    const turno = calcularTurnoOriginal(date, patron)
    expect(turno).toBe('dia')
  })

  it('returns null for rest days (positions 3-5 in 6-day cycle)', () => {
    const patron: PatronCiclo = { fechaInicio: '2025-01-01', cicloId: '1' } // D-D-D
    // Day 4 (Jan 4) = position 3 in 0-indexed 6-day cycle → rest day
    const date = new Date(2025, 0, 4)
    expect(calcularTurnoOriginal(date, patron)).toBeNull()
  })
})

// ─── calcularTurnoOriginal (horario de verano) ───
describe('calcularTurnoOriginal (DST America/Santiago)', () => {
  beforeAll(() => {
    process.env.TZ = 'America/Santiago'
  })

  it('is not off-by-one across the spring DST transition', () => {
    // Chile 2025: DST starts Sat Sep 6 at night → Sep 7 is a 23h day.
    // Ciclo '4' = [noche, noche, día] → Sep 5=pos0(N), Sep 6(pos1), Sep 7=pos2(D), Sep 8=pos3 (descanso).
    const patron: PatronCiclo = { fechaInicio: '2025-09-05', cicloId: '4' }
    expect(calcularTurnoOriginal(new Date(2025, 8, 5), patron)).toBe('noche')
    expect(calcularTurnoOriginal(new Date(2025, 8, 7), patron)).toBe('dia')
    // Con Math.floor(ms/86400000) esto devolvía 'dia' (pos 2) en lugar de descanso.
    expect(calcularTurnoOriginal(new Date(2025, 8, 8), patron)).toBeNull()
  })

  it('is not off-by-one across the autumn DST transition', () => {
    // Chile 2025: DST ends Sat Apr 5 at night → Apr 6 is a 25h day.
    const patron: PatronCiclo = { fechaInicio: '2025-04-04', cicloId: '1' }
    expect(calcularTurnoOriginal(new Date(2025, 3, 4), patron)).toBe('dia')
    expect(calcularTurnoOriginal(new Date(2025, 3, 5), patron)).toBe('dia')
    expect(calcularTurnoOriginal(new Date(2025, 3, 6), patron)).toBe('dia')
  })
})
describe('agruparAusencias', () => {
  it('returns empty array for no turnos', () => {
    expect(agruparAusencias({}, 2025)).toEqual([])
  })

  it('groups consecutive vacation days', () => {
    const turnos: TurnosData = {
      2025: {
        0: {
          6: { turnos: ['dia'], tipo: 'vacaciones' },
          7: { turnos: ['dia'], tipo: 'vacaciones' },
          8: { turnos: ['dia'], tipo: 'vacaciones' },
        },
      },
    }
    const groups = agruparAusencias(turnos, 2025)
    expect(groups).toHaveLength(1)
    expect(groups[0].tipo).toBe('vacaciones')
    expect(groups[0].diasHabiles).toBe(3)
  })
})

// ─── generarCartaVacaciones ───
describe('generarCartaVacaciones', () => {
  it('generates letter with name and date range', () => {
    const start = new Date(2025, 0, 6)
    const end = new Date(2025, 0, 10)
    const letter = generarCartaVacaciones(start, end, 'Juan Pérez')
    expect(letter).toContain('Juan Pérez')
    expect(letter).toContain('5 días hábiles')
    expect(letter).toContain('feriado legal')
  })
})

// ─── LocalStorage persistence ───
describe('saveLocalData / loadLocalData', () => {
  it('saves and loads data', () => {
    const turnos: TurnosData = { 2025: { 0: { 1: { turnos: ['dia'], tipo: 'turno' } } } }
    const perfil = defaultPerfil()
    saveLocalData(turnos, perfil)
    const loaded = loadLocalData()
    expect(loaded).not.toBeNull()
    expect(loaded!.turnos[2025][0][1].turnos).toEqual(['dia'])
    expect(loaded!.perfil.nombre).toBe('Usuario')
  })

  it('returns null for missing data', () => {
    expect(loadLocalData()).toBeNull()
  })
})
