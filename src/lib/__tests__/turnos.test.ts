import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import {
  defaultPerfil,
  calcularDashboardStats,
  calcularStatsAnuales,
  calcularStatsMensuales,
  calcularProyeccionAnual,
  calcularTurnoOriginal,
  agruparAusencias,
  generarCartaVacaciones,
  saveLocalData,
  loadLocalData,
  aplicarCiclo,
  obtenerDia,
  normalizarPerfil,
  generarRecordatorios,
  obtenerAvisoHoy,
} from '../turnos'
import { esDiaHabil, esFeriado, etiquetaTurnoDia } from '../feriados'
import { construirPlanilla, celdaDeDia, resumenPorDia, diasSinCobertura, planillaACSV } from '../planilla'
import type { TurnoTipo, TurnosData } from '../../types'
import { CICLOS_3X3, setCiclosPersonalizados, resolverCiclo } from '../../types'
import type { PatronCiclo } from '../../types'

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
    const patron: PatronCiclo = { fechaInicio: '2025-01-01', cicloId: '10' }
    const date = new Date(2025, 0, 1) // Wednesday Jan 1
    const turno = calcularTurnoOriginal(date, patron)
    expect(turno).toBe('dia')
  })

  it('returns null for rest days (positions 3-5 of the 3x3 cycle)', () => {
    const patron: PatronCiclo = { fechaInicio: '2025-01-01', cicloId: '10' }
    // Day 4 (Jan 4) = position 3 in 0-indexed 15-day cycle → rest day
    const date = new Date(2025, 0, 4)
    expect(calcularTurnoOriginal(date, patron)).toBeNull()
  })

  it('extrapolates backwards a cycle that starts mid-month', () => {
    const patron: PatronCiclo = { fechaInicio: '2025-01-15', cicloId: '10' }
    // Jan 11 = 4 days before start → stage -4 → stage 14 = 'noche'
    expect(calcularTurnoOriginal(new Date(2025, 0, 11), patron)).toBe('noche')
    // Jan 1 = 14 days before start → stage -14 → stage 4 = 'descanso'
    expect(calcularTurnoOriginal(new Date(2025, 0, 1), patron)).toBeNull()
  })
})

// ─── calcularTurnoOriginal (horario de verano) ───
describe('calcularTurnoOriginal (DST America/Santiago)', () => {
  beforeAll(() => {
    process.env.TZ = 'America/Santiago'
  })

  it('is not off-by-one across the spring DST transition', () => {
    // Chile 2025: DST starts Sat Sep 6 at night → Sep 7 is a 23h day.
    // Ciclo '10' = día, día, día, descanso... → Sep 5=pos0, Sep 7=pos2 (día), Sep 8=pos3 (descanso).
    const patron: PatronCiclo = { fechaInicio: '2025-09-05', cicloId: '10' }
    expect(calcularTurnoOriginal(new Date(2025, 8, 5), patron)).toBe('dia')
    expect(calcularTurnoOriginal(new Date(2025, 8, 7), patron)).toBe('dia')
    // Con Math.floor(ms/86400000) esto devolvía 'dia' (pos 2) en lugar de descanso.
    expect(calcularTurnoOriginal(new Date(2025, 8, 8), patron)).toBeNull()
  })

  it('is not off-by-one across the autumn DST transition', () => {
    // Chile 2025: DST ends Sat Apr 5 at night → Apr 6 is a 25h day.
    const patron: PatronCiclo = { fechaInicio: '2025-04-04', cicloId: '10' }
    expect(calcularTurnoOriginal(new Date(2025, 3, 4), patron)).toBe('dia')
    expect(calcularTurnoOriginal(new Date(2025, 3, 5), patron)).toBe('dia')
    expect(calcularTurnoOriginal(new Date(2025, 3, 6), patron)).toBe('dia')
  })
})
// ─── aplicarCiclo ───
describe('aplicarCiclo', () => {
  it('keeps vacations when applying a cycle', () => {
    const turnos: TurnosData = {
      2025: { 0: { 1: { turnos: ['dia'], tipo: 'vacaciones', estado: 'pendiente' } } },
    }
    const result = aplicarCiclo(turnos, 2025, 0, { fechaInicio: '2025-01-01', cicloId: '10' })
    expect(result[2025][0][1].tipo).toBe('vacaciones')
  })

  it('overwrites stored work days inside the cycle', () => {
    const turnos: TurnosData = {
      2025: { 0: { 1: { turnos: ['noche'], tipo: 'turno' } } },
    }
    const result = aplicarCiclo(turnos, 2025, 0, { fechaInicio: '2025-01-01', cicloId: '10' })
    expect(result[2025][0][1].turnos).toEqual(['dia'])
  })

  it('fills the whole month even when the cycle starts mid-month', () => {
    // Ciclo '10': 18 días = 3 día → 3 descanso → 3 noche → 3 descanso → 3 noche → 3 descanso
    // Start Jan 15 → extrapolando hacia atrás: día 11 = 4 días antes → pos 14 = noche
    const result = aplicarCiclo({}, 2025, 0, { fechaInicio: '2025-01-15', cicloId: '10' })
    // Días previos al inicio ya tienen turno extrapolado del ciclo
    expect(result[2025]?.[0]?.[9]?.turnos).toEqual(['noche'])
    expect(result[2025]?.[0]?.[10]?.turnos).toEqual(['noche'])
    expect(result[2025]?.[0]?.[11]?.turnos).toEqual(['noche'])
    expect(result[2025]?.[0]?.[1]).toBeUndefined() // día 1 = descanso extrapolado
    // El día de inicio sigue siendo 'dia'
    expect(result[2025]?.[0]?.[15]?.turnos).toEqual(['dia'])
    // Todos los días del mes ya vienen resueltos (turno o descanso)
    for (let d = 1; d <= 31; d++) {
      const entry = result[2025]?.[0]?.[d]
      const stage = ((d - 15) % 18 + 18) % 18
      if (CICLOS_3X3['10'][stage] === 'descanso') {
        expect(entry).toBeUndefined()
      } else {
        expect(entry?.turnos).toEqual([CICLOS_3X3['10'][stage]])
      }
    }
  })
})

// ─── obtenerDia (auto-generación) ───
describe('obtenerDia', () => {
  it('returns the stored day when present', () => {
    const turnos: TurnosData = { 2025: { 0: { 1: { turnos: ['noche'], tipo: 'turno' } } } }
    const dia = obtenerDia(turnos, 2025, 0, 1, null)
    expect(dia).toBeDefined()
    expect(dia!.turnos).toEqual(['noche'])
  })

  it('auto-generates turns from the pattern in any month', () => {
    const patron: PatronCiclo = { fechaInicio: '2025-01-01', cicloId: '10' }
    // Feb 19 is 49 days after start → 49 % 18 = 13 → 'noche'
    const feb19 = obtenerDia({}, 2025, 1, 19, patron)
    expect(feb19).toBeDefined()
    expect(feb19!.turnos).toEqual(['noche'])
    // Feb 21 is position 15 → rest day, not generated
    expect(obtenerDia({}, 2025, 1, 21, patron)).toBeUndefined()
  })

  it('does not regenerate from the pattern for a cleared month', () => {
    const patron: PatronCiclo = { fechaInicio: '2025-01-01', cicloId: '10' }
    // Sin almacenamiento, el patrón genera 'dia' el 1.º de enero
    expect(obtenerDia({}, 2025, 0, 1, patron)).toBeDefined()
    // Con el mes marcado como borrado, no vuelve a auto-generarse
    expect(obtenerDia({}, 2025, 0, 1, patron, ['2025-0'])).toBeUndefined()
  })

  it('does not auto-generate any month after a full clear', () => {
    const patron: PatronCiclo = { fechaInicio: '2025-01-01', cicloId: '10' }
    expect(obtenerDia({}, 2025, 5, 1, patron, ['*'])).toBeUndefined()
    expect(obtenerDia({}, 2025, 10, 15, patron, ['*'])).toBeUndefined()
  })

  it('returns stored days even for a cleared month', () => {
    const turnos: TurnosData = { 2025: { 0: { 1: { turnos: ['noche'], tipo: 'turno' } } } }
    const dia = obtenerDia(turnos, 2025, 0, 1, null, ['2025-0'])
    expect(dia).toBeDefined()
    expect(dia!.turnos).toEqual(['noche'])
  })

  it('returns nothing without a pattern', () => {
    expect(obtenerDia({}, 2025, 0, 1, null)).toBeUndefined()
  })
})

// ─── Ciclo 3x3 real (18 días: 3 día → 3 descanso → 3 noche → 3 descanso → 3 noche → 3 descanso) ───
describe('ciclo 3x3 real (18 días)', () => {
  const patron: PatronCiclo = { fechaInicio: '2025-01-06', cicloId: '10' }

  it('generates day block, rest, night, rest, night, rest', () => {
    for (let d = 6; d <= 8; d++) expect(calcularTurnoOriginal(new Date(2025, 0, d), patron)).toBe('dia')
    for (let d = 9; d <= 11; d++) expect(calcularTurnoOriginal(new Date(2025, 0, d), patron)).toBeNull()
    for (let d = 12; d <= 14; d++) expect(calcularTurnoOriginal(new Date(2025, 0, d), patron)).toBe('noche')
    for (let d = 15; d <= 17; d++) expect(calcularTurnoOriginal(new Date(2025, 0, d), patron)).toBeNull()
    for (let d = 18; d <= 20; d++) expect(calcularTurnoOriginal(new Date(2025, 0, d), patron)).toBe('noche')
    for (let d = 21; d <= 23; d++) expect(calcularTurnoOriginal(new Date(2025, 0, d), patron)).toBeNull()
  })

  it('repeats the cycle on the next block', () => {
    // Jan 24 = position 0 of a new 18-day period → day block again
    for (let d = 24; d <= 26; d++) expect(calcularTurnoOriginal(new Date(2025, 0, d), patron)).toBe('dia')
  })

  it('applies the cycle across month boundary', () => {
    const result = aplicarCiclo({}, 2025, 1, patron)
    // Feb 12: diff from Jan 6 = 37 días → 37 % 18 = 1 → 'dia'
    expect(result[2025]?.[1]?.[12]?.turnos).toEqual(['dia'])
    // Feb 14: diff = 39 → 39 % 18 = 3 → 'descanso' (no generado)
    expect(result[2025]?.[1]?.[14]).toBeUndefined()
  })
})

// ─── Ciclo 4x4 (16 días: 4 día → 4 descanso → 4 noche → 4 descanso → se repite) ───
describe('ciclo 4x4 (16 días)', () => {
  const patron: PatronCiclo = { fechaInicio: '2025-02-03', cicloId: '4x4' }

  it('generates day, rest, night and final rest blocks', () => {
    for (let d = 3; d <= 6; d++) expect(calcularTurnoOriginal(new Date(2025, 1, d), patron)).toBe('dia')
    for (let d = 7; d <= 10; d++) expect(calcularTurnoOriginal(new Date(2025, 1, d), patron)).toBeNull()
    for (let d = 11; d <= 14; d++) expect(calcularTurnoOriginal(new Date(2025, 1, d), patron)).toBe('noche')
    for (let d = 15; d <= 18; d++) expect(calcularTurnoOriginal(new Date(2025, 1, d), patron)).toBeNull()
  })

  it('repeats with the day block after the final rest', () => {
    // Feb 19 = 16 days after start → position 0 of the next period → day again
    for (let d = 19; d <= 22; d++) expect(calcularTurnoOriginal(new Date(2025, 1, d), patron)).toBe('dia')
  })
})

// ─── Múltiples ciclos (patrones) ───
describe('normalizarPerfil', () => {
  it('migrates a legacy perfil without patrones into patrones=[patronActual]', () => {
    const p = defaultPerfil()
    p.patronActual = { fechaInicio: '2025-01-06', cicloId: '10' }
    const norm = normalizarPerfil(p)
    expect(norm.patrones).toHaveLength(1)
    expect(norm.patrones[0]).toEqual(p.patronActual)
  })

  it('keeps existing patrones untouched', () => {
    const p = defaultPerfil()
    p.patronActual = { fechaInicio: '2025-01-06', cicloId: '10' }
    p.patrones = [
      { fechaInicio: '2025-01-06', cicloId: '10' },
      { fechaInicio: '2025-03-10', cicloId: '4x4' },
    ]
    const norm = normalizarPerfil(p)
    expect(norm.patrones).toHaveLength(2)
  })
})

// ─── Planilla del mes (quién trabaja cada día) ───
describe('planilla', () => {
  it('celdaDeDia mapea vacaciones, administrativo, noche y descanso', () => {
    expect(celdaDeDia(undefined, 2026, 0, 1)).toBe('')

    const datos: TurnosData = {
      2026: {
        0: {
          1: { turnos: ['noche'] as TurnoTipo[], tipo: 'turno' as const },
          2: { turnos: ['dia'] as TurnoTipo[], tipo: 'vacaciones' as const },
          3: { turnos: ['dia'] as TurnoTipo[], tipo: 'administrativo' as const },
          4: { turnos: [] as TurnoTipo[], tipo: 'turno' as const },
          6: { turnos: ['noche', 'dia'] as TurnoTipo[], tipo: 'turno' as const },
        },
      },
    }
    expect(celdaDeDia(datos, 2026, 0, 1)).toBe('N')
    expect(celdaDeDia(datos, 2026, 0, 2)).toBe('V')
    expect(celdaDeDia(datos, 2026, 0, 3)).toBe('AD')
    expect(celdaDeDia(datos, 2026, 0, 4)).toBe('')
    expect(celdaDeDia(datos, 2026, 0, 6)).toBe('DN')
  })

  it('construirPlanilla ordena por nombre y cubre todos los días del mes', () => {
    const planilla = construirPlanilla(
      [
        { id: 'b', nombre: 'Bruno', datos: {} },
        { id: 'a', nombre: 'Ana', datos: {} },
      ],
      2026,
      0
    )
    expect(planilla.totalDias).toBe(31)
    expect(planilla.filas.map((f) => f.nombre)).toEqual(['Ana', 'Bruno'])
    expect(planilla.filas[0].celdas).toHaveLength(31)
  })

  it('resumenPorDia cuenta quién trabaja el día 2', () => {
    const planilla = construirPlanilla(
      [
        {
          id: 'a',
          nombre: 'Ana Perez',
          datos: {
            2026: { 0: { 2: { turnos: ['noche'] as TurnoTipo[], tipo: 'turno' as const } } },
          },
        },
        {
          id: 'b',
          nombre: 'Bruno Diaz',
          datos: {
            2026: { 0: { 2: { turnos: ['dia'] as TurnoTipo[], tipo: 'turno' as const } } },
          },
        },
      ],
      2026,
      0
    )
    const resumen = resumenPorDia(planilla)
    expect(resumen[1].dia).toBe(2)
    expect(resumen[1].conTurno).toEqual(['Ana Perez', 'Bruno Diaz'])
    expect(resumen[1].turnos).toBe(2)
  })

  it('miembro virtual recibe su ciclo automáticamente en la planilla', () => {
    // Ciclo '10' (3x3 real): día 1 = 'dia', día 2 = 'dia', día 3 = 'dia', día 4 = descanso
    const planilla = construirPlanilla(
      [
        {
          id: 'virtual-1',
          nombre: 'Luis Muñoz',
          datos: {},
          virtual: { cicloId: '10', fechaInicio: '2026-01-01' },
        },
      ],
      2026,
      0
    )
    const fila = planilla.filas[0]
    expect(fila.celdas[0]).toBe('D')
    expect(fila.celdas[1]).toBe('D')
    expect(fila.celdas[3]).toBe('') // día 4 = descanso
  })

  it('diasSinCobertura marca los días sin turnos', () => {
    const planilla = construirPlanilla(
      [
        {
          id: 'a',
          nombre: 'Ana',
          datos: { 2026: { 0: { 1: { turnos: ['dia'] as TurnoTipo[], tipo: 'turno' as const } } } },
        },
      ],
      2026,
      0
    )
    expect(diasSinCobertura(planilla)[0]).toBe(2)
    expect(diasSinCobertura(planilla)).not.toContain(1)
  })

  it('planillaACSV genera CSV con cabecera de días', () => {
    const planilla = construirPlanilla(
      [{ id: 'a', nombre: 'Ana', datos: {} }],
      2026,
      0
    )
    const csv = planillaACSV(planilla)
    expect(csv).toContain('Trabajador;1;2;3')
    expect(csv).toContain('Ana;')
  })
})

// ─── Ciclos personalizados y presets nuevos ───
describe('ciclos personalizados', () => {
  beforeEach(() => setCiclosPersonalizados({}))

  it('lista los presets nuevos (5x3, 4x2, 4x3, 5x2, 3x2)', () => {
    expect(resolverCiclo('5x3')).toHaveLength(16)
    expect(resolverCiclo('4x2')).toHaveLength(12)
    expect(resolverCiclo('4x3')).toHaveLength(14)
    expect(resolverCiclo('5x2')).toHaveLength(14)
    expect(resolverCiclo('3x2')).toHaveLength(10)
  })

  it('resuelve un ciclo personalizado registrado y calcula turnos', () => {
    setCiclosPersonalizados({
      'custom-lun-vie': {
        nombre: 'Lun a Vie',
        pasos: ['dia', 'dia', 'dia', 'dia', 'dia', 'descanso', 'descanso'],
      },
    })
    const patron: PatronCiclo = { fechaInicio: '2025-01-01', cicloId: 'custom-lun-vie' }
    expect(calcularTurnoOriginal(new Date(2025, 0, 1), patron)).toBe('dia')
    expect(calcularTurnoOriginal(new Date(2025, 0, 6), patron)).toBeNull() // descanso
    expect(calcularTurnoOriginal(new Date(2025, 0, 8), patron)).toBe('dia') // repite
  })

  it('ignora ciclos personalizados de otros ids', () => {
    expect(resolverCiclo('no-existe')).toBeUndefined()
  })
})

// ─── Feriados Ley Sana ───
describe('feriados Ley Sana', () => {
  it('marks the Monday after a Sunday holiday as non-working', () => {
    // En 2025 el feriado "Encuentro Dos Mundos" (12 oct) cae domingo
    expect(esFeriado(new Date(2025, 9, 12))).toBe(true)
    expect(esDiaHabil(new Date(2025, 9, 13))).toBe(false) // lunes festivo
  })

  it('keeps a normal Monday as working day', () => {
    expect(esDiaHabil(new Date(2025, 9, 6))).toBe(true) // lunes 6 oct
  })
})

// ─── Estadísticas anuales ───
describe('calcularStatsAnuales', () => {
  it('counts day, night and extra shifts in a year', () => {
    const turnos: TurnosData = {
      2025: {
        0: {
          1: { turnos: ['dia'], tipo: 'turno' },
          2: { turnos: ['noche'], tipo: 'turno' },
          3: { turnos: ['dia', 'extra-dia'], tipo: 'turno' },
          4: { turnos: ['noche', 'extra-noche'], tipo: 'turno' },
          5: { turnos: ['dia'], tipo: 'vacaciones' },
          6: { turnos: ['dia'], tipo: 'administrativo' },
        },
      },
    }
    const s = calcularStatsAnuales(turnos, 2025)
    expect(s.dias).toBe(2)
    expect(s.noches).toBe(2)
    expect(s.extrasDia).toBe(1)
    expect(s.extrasNoche).toBe(1)
    expect(s.diasTrabajados).toBe(4)
    expect(s.vacaciones).toBe(1)
    expect(s.administrativos).toBe(1)
  })
})

// ─── Estadísticas mensuales ───
describe('calcularStatsMensuales', () => {
  it('cuenta días, noches, mixtos y horas por mes', () => {
    const turnos: TurnosData = {
      2025: {
        0: {
          1: { turnos: ['dia'], tipo: 'turno' },
          2: { turnos: ['noche'], tipo: 'turno' },
          3: { turnos: ['dia', 'noche'], tipo: 'turno' }, // mixto
          4: { turnos: ['extra-dia'], tipo: 'turno' },
          5: { turnos: ['dia'], tipo: 'vacaciones' }, // no cuenta
        },
      },
    }
    const meses = calcularStatsMensuales(turnos, 2025)
    expect(meses).toHaveLength(12)
    const enero = meses[0]
    expect(enero.dias).toBe(2) // día simple + mixto
    expect(enero.noches).toBe(2) // noche simple + mixto
    expect(enero.mixtos).toBe(1)
    expect(enero.diasTrabajados).toBe(4) // 1,2,3,4 (no el de vacaciones)
    // horas: dia(12) + noche(12) + mixto(24) + extra(12) = 60
    expect(enero.horas).toBe(60)
    expect(enero.extras).toBe(1)
  })
})

describe('calcularProyeccionAnual', () => {
  it('proyecta el año a partir de los meses con datos', () => {
    // Solo enero con 4 días trabajados (meses transcurridos ~1 en simulacro de año actual)
    const turnos: TurnosData = {
      [new Date().getFullYear()]: {
        0: {
          1: { turnos: ['dia'], tipo: 'turno' },
          2: { turnos: ['dia'], tipo: 'turno' },
          3: { turnos: ['dia'], tipo: 'turno' },
          4: { turnos: ['dia'], tipo: 'turno' },
        },
      },
    }
    const p = calcularProyeccionAnual(turnos, new Date().getFullYear())
    expect(p.diasTrabajados).toBeGreaterThan(4)
    expect(p.horas).toBeGreaterThan(48)
  })
})

// ─── agruparAusencias ───
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

// ─── etiquetaTurnoDia / recordatorios ───
describe('etiquetaTurnoDia', () => {
  it('classifica DIA / NOCHE / DN / Descanso / ausencias', () => {
    expect(etiquetaTurnoDia({ turnos: ['dia'], tipo: 'turno' })).toBe('DÍA')
    expect(etiquetaTurnoDia({ turnos: ['noche'], tipo: 'turno' })).toBe('NOCHE')
    expect(etiquetaTurnoDia({ turnos: ['dia', 'noche'], tipo: 'turno' })).toBe('DN')
    expect(etiquetaTurnoDia({ turnos: ['extra-dia'], tipo: 'turno' })).toBe('DÍA')
    expect(etiquetaTurnoDia({ turnos: [], tipo: 'turno' })).toBe('Descanso')
    expect(etiquetaTurnoDia({ turnos: ['dia'], tipo: 'vacaciones' })).toBe('Vacaciones')
    expect(etiquetaTurnoDia({ turnos: ['dia'], tipo: 'administrativo' })).toBe('Administrativo')
    expect(etiquetaTurnoDia(null)).toBe('Descanso')
  })
})

describe('generarRecordatorios', () => {
  it('genera 15 días y marca el turno de mañana', () => {
    const recs = generarRecordatorios({}, null, [], 15)
    expect(recs).toHaveLength(15)
    expect(recs[0].fecha).toBeTruthy()
  })
})

describe('obtenerAvisoHoy', () => {
  it('devuelve texto y flag', () => {
    const aviso = obtenerAvisoHoy({}, null, [])
    expect(typeof aviso.texto).toBe('string')
    expect(typeof aviso.esTurno).toBe('boolean')
  })
})
