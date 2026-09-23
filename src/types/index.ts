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
  '10': ['dia', 'dia', 'dia', 'descanso', 'descanso', 'descanso', 'noche', 'noche', 'noche', 'descanso', 'descanso', 'descanso', 'noche', 'noche', 'noche'],
  '1': ['dia', 'dia', 'dia', 'descanso', 'descanso', 'descanso'],
  '2': ['noche', 'noche', 'noche', 'descanso', 'descanso', 'descanso'],
  '3': ['dia', 'noche', 'dia', 'descanso', 'descanso', 'descanso'],
  '4': ['noche', 'noche', 'dia', 'descanso', 'descanso', 'descanso'],
  '5': ['noche', 'dia', 'noche', 'descanso', 'descanso', 'descanso'],
  '6': ['dia', 'noche', 'noche', 'descanso', 'descanso', 'descanso'],
  '7': ['dia', 'dia', 'noche', 'descanso', 'descanso', 'descanso'],
  '9': ['noche', 'dia', 'dia', 'descanso', 'descanso', 'descanso'],
}

export const CICLOS_LABELS: Record<string, string> = {
  '10': '3x3 Real: Día-Desc-Noche-Desc-Noche (15 días)',
  '1': 'Solo Día (D-D-D)',
  '2': 'Solo Noche (N-N-N)',
  '3': 'Alternando (D-N-D)',
  '4': 'Noche-Noche-Día (N-N-D)',
  '5': 'Noche-Día-Noche (N-D-N)',
  '6': 'Día-Noche-Noche (D-N-N)',
  '7': 'Día-Día-Noche (D-D-N)',
  '9': 'Noche-Día-Día (N-D-D)',
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
