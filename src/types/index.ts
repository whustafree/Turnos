// ─── Turno Types ───
export type TurnoTipo = 'dia' | 'noche' | 'extra-dia' | 'extra-noche'

export interface DiaTurno {
  turnos: TurnoTipo[]
  tipo: 'turno' | 'vacaciones' | 'administrativo'
  estado?: 'aprobado' | 'pendiente'
  locked?: boolean
}

export type TurnosData = Record<number, Record<number, Record<number, DiaTurno>>>

// ─── Perfil ───
export interface UserProfile {
  nombre: string
  cargo: string
  empresa: string
  /** Total días administrativos disponibles (configurable) */
  adminTotal: number
  /** Vacaciones por ley (default 15) */
  vacacionesLey: number
  /** Vacaciones adicionales del sindicato (default 2) */
  vacacionesSindicato: number
  /** Total vacaciones calculado (ley + sindicato) */
  vacacionesTotal: number
  patronActual: PatronCiclo | null
  /** Ciclos guardados (puedes tener varios; el activo es patronActual) */
  patrones: PatronCiclo[]
}

export interface PatronCiclo {
  fechaInicio: string
  cicloId: string
}

// ─── Ciclos 3x3 ───
// Cada ciclo es una secuencia de pasos; 'descanso' indica día libre.
// El periodo puede variar (ej: 6 días para 3x3 simple, 12 días para el
// régimen 3x3 real: 3 día → 3 descanso → 3 noche → 3 descanso).
export type CicloPaso = TurnoTipo | 'descanso'

const bloque = (n: number, paso: Exclude<CicloPaso, 'descanso'>): CicloPaso[] =>
  Array.from({ length: n }, () => paso)
const descanso = (n: number): CicloPaso[] => Array.from({ length: n }, () => 'descanso' as CicloPaso)

export const CICLOS_3X3: Record<string, CicloPaso[]> = {
  // 3x3 real: 3 día → 3 descanso → 3 noche → 3 descanso → 3 noche → 3 descanso (18 días)
  '10': ['dia', 'dia', 'dia', 'descanso', 'descanso', 'descanso', 'noche', 'noche', 'noche', 'descanso', 'descanso', 'descanso', 'noche', 'noche', 'noche', 'descanso', 'descanso', 'descanso'],
  // 4x4: 4 día → 4 descanso → 4 noche → 4 descanso → se repite (16 días)
  '4x4': ['dia', 'dia', 'dia', 'dia', 'descanso', 'descanso', 'descanso', 'descanso', 'noche', 'noche', 'noche', 'noche', 'descanso', 'descanso', 'descanso', 'descanso'],
  // 5x3: 5 día → 3 descanso → 5 noche → 3 descanso (16 días)
  '5x3': [...bloque(5, 'dia'), ...descanso(3), ...bloque(5, 'noche'), ...descanso(3)],
  // 4x2: 4 día → 2 descanso → 4 noche → 2 descanso (12 días)
  '4x2': [...bloque(4, 'dia'), ...descanso(2), ...bloque(4, 'noche'), ...descanso(2)],
  // 4x3: 4 día → 3 descanso → 4 noche → 3 descanso (14 días)
  '4x3': [...bloque(4, 'dia'), ...descanso(3), ...bloque(4, 'noche'), ...descanso(3)],
  // 5x2: 5 día → 2 descanso → 5 noche → 2 descanso (14 días)
  '5x2': [...bloque(5, 'dia'), ...descanso(2), ...bloque(5, 'noche'), ...descanso(2)],
  // 3x2: 3 día → 2 descanso → 3 noche → 2 descanso (10 días)
  '3x2': [...bloque(3, 'dia'), ...descanso(2), ...bloque(3, 'noche'), ...descanso(2)],
}

export const CICLOS_LABELS: Record<string, string> = {
  '10': '3x3 Real: Día-Desc-Noche-Desc-Noche-Desc (18 días)',
  '4x4': '4x4: Día-Descanso-Noche-Descanso (16 días)',
  '5x3': '5x3: Día-Descanso-Noche-Descanso (16 días)',
  '4x2': '4x2: Día-Descanso-Noche-Descanso (12 días)',
  '4x3': '4x3: Día-Descanso-Noche-Descanso (14 días)',
  '5x2': '5x2: Día-Descanso-Noche-Descanso (14 días)',
  '3x2': '3x2: Día-Descanso-Noche-Descanso (10 días)',
}

// ─── Ciclos personalizados (creados por el usuario) ───
export interface CicloPersonalizado {
  nombre: string
  pasos: CicloPaso[]
}

// Registro en memoria: los ciclos custom se cargan desde el perfil.
const CUSTOM: { map: Record<string, CicloPersonalizado> } = { map: {} }

export function setCiclosPersonalizados(map?: Record<string, CicloPersonalizado> | null): void {
  CUSTOM.map = map && typeof map === 'object' && !Array.isArray(map) ? map : {}
}

export function getCiclosPersonalizados(): Record<string, CicloPersonalizado> {
  return CUSTOM.map
}

/** Resuelve un ciclo por id: primero los presets, luego los personalizados. */
export function resolverCiclo(cicloId: string): CicloPaso[] | undefined {
  return CICLOS_3X3[cicloId] ?? CUSTOM.map[cicloId]?.pasos
}

/** Etiqueta legible de un ciclo (preset o personalizado). */
export function etiquetaCiclo(cicloId: string): string {
  return CICLOS_LABELS[cicloId] ?? CUSTOM.map[cicloId]?.nombre ?? cicloId
}

/** Todos los ciclos disponibles (presets + personalizados) para selects. */
export function listarCiclos(): { id: string; label: string }[] {
  const presets = Object.entries(CICLOS_LABELS).map(([id, label]) => ({ id, label }))
  const custom = Object.entries(CUSTOM.map).map(([id, c]) => ({ id, label: c.nombre }))
  return [...presets, ...custom]
}

// ─── Stats Dashboard ───
export interface DashboardStats {
  adminUsados: number
  adminTotal: number
  vacacionesUsadas: number
  vacacionesLey: number
  vacacionesSindicato: number
  vacacionesTotal: number
}

// ─── Ausencias ───
export interface AusenciaItem {
  fecha: Date
  tipo: 'vacaciones' | 'administrativo'
}

export interface AusenciaGroup {
  inicio: Date
  fin: Date
  tipo: 'vacaciones' | 'administrativo'
  items: AusenciaItem[]
}
