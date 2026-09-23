import { supabase } from './supabase'
import type { MiembroRoster } from './planilla'
import type { TurnosData } from '../types'

export interface EquipoMiembro {
  user_id: string
  rol: 'owner' | 'miembro'
  equipo_id: string
}

export async function obtenerEquipoId(): Promise<{ equipoId: string | null; disponible: boolean }> {
  try {
    const { data, error } = await supabase
      .from('equipos')
      .select('id')
      .limit(1)
    if (error) throw error
    return { equipoId: data?.[0]?.id ?? null, disponible: true }
  } catch (e: any) {
    const msg = (e?.message || '').toLowerCase()
    // Tabla no existe → todavía no se ejecutó supabase/equipo.sql
    const noTabla = msg.includes('does not exist') || msg.includes('relation') || msg.includes('42p01')
    return { equipoId: null, disponible: !noTabla }
  }
}

export async function crearEquipo(nombre: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('crear_equipo', {
      p_nombre: nombre.trim() || 'Mi Equipo',
    })
    if (error) throw error
    return data as string
  } catch {
    return null
  }
}

export async function obtenerMiembros(equipoId: string): Promise<EquipoMiembro[]> {
  try {
    const { data, error } = await supabase
      .from('miembros_equipo')
      .select('user_id, rol, equipo_id')
      .eq('equipo_id', equipoId)
    if (error) throw error
    return (data || []) as EquipoMiembro[]
  } catch {
    return []
  }
}

export async function agregarMiembro(equipoId: string, email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('agregar_miembro', {
      p_equipo_id: equipoId,
      p_email: email.trim().toLowerCase(),
    })
    if (error) return { ok: false, error: (error as any).message || error.message }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Error al agregar miembro' }
  }
}

export async function quitarMiembro(equipoId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('quitar_miembro', {
      p_equipo_id: equipoId,
      p_user_id: userId,
    })
    return !error
  } catch {
    return false
  }
}

// El admin crea la cuenta (signUp con la clave pública) y luego invita al equipo
export async function crearCuentaYAgregar(
  equipoId: string,
  nombre: string,
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { nombre: nombre.trim() },
      },
    })
    if (error) return { ok: false, error: (error as any).message || error.message }
    if (!data.user) return { ok: false, error: 'No se pudo crear la cuenta' }
    if (data.session) {
      // Sin confirmación de correo: ya entró, se puede agregar directo
      const r = await agregarMiembro(equipoId, email.trim().toLowerCase())
      return r
    }
    // Requiere confirmar el correo: se agrega con un reintento tras confirmar
    return {
      ok: false,
      error: '✉️ Cuenta creada. Requiere confirmar el correo antes de agregarla. Puedes usar "Agregar por correo" después.',
    }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Error al crear cuenta' }
  }
}

// Descarga turnos + perfil de cada miembro para construir la planilla
export async function cargarTurnosMiembros(miembros: EquipoMiembro[]): Promise<MiembroRoster[]> {
  const roster: MiembroRoster[] = []
  for (const m of miembros) {
    try {
      const { data, error } = await supabase
        .from('usuarios_turnos')
        .select('datos_turnos, datos_perfil')
        .eq('user_id', m.user_id)
        .maybeSingle()
      if (error) continue
      const perfil: any = data?.datos_perfil || {}
      roster.push({
        id: m.user_id,
        nombre: perfil.nombre || 'Miembro',
        datos: (data?.datos_turnos || {}) as TurnosData,
      })
    } catch {
      /* siguiente miembro */
    }
  }
  return roster
}