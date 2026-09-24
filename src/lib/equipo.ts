import { supabase } from './supabase'
import type { MiembroRoster } from './planilla'
import type { TurnosData } from '../types'

export interface EquipoMiembro {
  user_id: string
  rol: 'owner' | 'miembro'
  equipo_id: string
}

export interface MiembroVirtual {
  id: string
  equipo_id: string
  nombre: string
  ciclo_id: string
  fecha_inicio: string
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

// El dueño cambia la contraseña de un miembro de su equipo
export async function cambiarPasswordMiembro(userId: string, nuevaPassword: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('cambiar_password_miembro', {
      p_user_id: userId,
      p_nueva_password: nuevaPassword,
    })
    if (error) return { ok: false, error: (error as any).message || error.message }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Error al cambiar la contraseña' }
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

// ─── Miembros virtuales (personas sin app) ───

export async function obtenerVirtuales(equipoId: string): Promise<MiembroVirtual[]> {
  try {
    const { data, error } = await supabase
      .from('miembros_virtuales')
      .select('id, equipo_id, nombre, ciclo_id, fecha_inicio')
      .eq('equipo_id', equipoId)
      .order('nombre')
    if (error) throw error
    return (data || []) as MiembroVirtual[]
  } catch (e: any) {
    const msg = (e?.message || '').toLowerCase()
    const noTabla = msg.includes('does not exist') || msg.includes('relation') || msg.includes('42p01')
    if (noTabla) {
      // Todavía no se ejecutó supabase/virtuales.sql
      return []
    }
    return []
  }
}

export async function crearVirtual(
  equipoId: string,
  nombre: string,
  cicloId: string,
  fechaInicio: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('crear_virtual', {
      p_equipo_id: equipoId,
      p_nombre: nombre.trim(),
      p_ciclo_id: cicloId,
      p_fecha_inicio: fechaInicio || '2025-01-01',
    })
    if (error) return { ok: false, error: (error as any).message || error.message }
    return { ok: true, error: undefined }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Error al crear la persona' }
  }
}

export async function actualizarVirtual(
  id: string,
  nombre: string,
  cicloId: string,
  fechaInicio: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('actualizar_virtual', {
      p_id: id,
      p_nombre: nombre.trim(),
      p_ciclo_id: cicloId,
      p_fecha_inicio: fechaInicio || '2025-01-01',
    })
    if (error) return { ok: false, error: (error as any).message || error.message }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Error al actualizar' }
  }
}

export async function eliminarVirtual(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('eliminar_virtual', { p_id: id })
    return !error
  } catch {
    return false
  }
}

// Descarga turnos + perfil de cada miembro para construir la planilla.
// Incluye a los miembros virtuales (sin cuenta): se agregan con su ciclo.
export async function cargarTurnosMiembros(
  miembros: EquipoMiembro[],
  virtuales: MiembroVirtual[] = []
): Promise<MiembroRoster[]> {
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
  for (const v of virtuales) {
    roster.push({
      id: `virtual-${v.id}`,
      nombre: v.nombre || 'Trabajador',
      datos: {},
      virtual: { cicloId: v.ciclo_id, fechaInicio: v.fecha_inicio },
    })
  }
  return roster
}