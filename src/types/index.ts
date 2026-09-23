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

export const CICLOS_3X3: Record<string, CicloPaso[]> = {
  // 3x3 real: 3 día → 3 descanso → 3 noche → 3 descanso → 3 noche → 3 descanso (18 días)
  '10': ['dia', 'dia', 'dia', 'descanso', 'descanso', 'descanso', 'noche', 'noche', 'noche', 'descanso', 'descanso', 'descanso', 'noche', 'noche', 'noche', 'descanso', 'descanso', 'descanso'],
  // 4x4: 4 día → 4 descanso → 4 noche → se repite (12 días)
  '4x4': ['dia', 'dia', 'dia', 'dia', 'descanso', 'descanso', 'descanso', 'descanso', 'noche', 'noche', 'noche', 'noche'],
}

export const CICLOS_LABELS: Record<string, string> = {
  '10': '3x3 Real: Día-Desc-Noche-Desc-Noche-Desc (18 días)',
  '4x4': '4x4: Día-Descanso-Noche (12 días)',
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
