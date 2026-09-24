import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Printer, UserPlus, Trash2, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { construirPlanilla, resumenPorDia } from '../lib/planilla'
import {
  obtenerEquipoId,
  crearEquipo,
  obtenerMiembros,
  agregarMiembro,
  quitarMiembro,
  crearCuentaYAgregar,
  cargarTurnosMiembros,
  obtenerVirtuales,
  crearVirtual,
  actualizarVirtual,
  eliminarVirtual,
} from '../lib/equipo'
import type { EquipoMiembro, MiembroVirtual } from '../lib/equipo'
import type { MiembroRoster, PlanillaMes } from '../lib/planilla'
import { CICLOS_LABELS } from '../types'

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
const DIAS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']
const CELDA_COLOR: Record<string, string> = {
  D: '#059669',
  N: '#4338ca',
  DN: '#7c3aed',
  V: '#ca8a04',
  AD: '#2563eb',
}

export default function EquipoTab() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [equipoId, setEquipoId] = useState<string | null>(null)
  const [disponible, setDisponible] = useState(true)
  const [loading, setLoading] = useState(true)
  const [miembros, setMiembros] = useState<EquipoMiembro[]>([])
  const [virtuales, setVirtuales] = useState<MiembroVirtual[]>([])
  const [roster, setRoster] = useState<MiembroRoster[]>([])
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  // formularios
  const [nombreEquipo, setNombreEquipo] = useState('')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // formulario persona sin app
  const [vNombre, setVNombre] = useState('')
  const [vCiclo, setVCiclo] = useState('10')
  const [vFecha, setVFecha] = useState(today.toISOString().slice(0, 10))
  const [editVirtualId, setEditVirtualId] = useState<string | null>(null)

  // ─── Pinch-zoom de la planilla ───
  const [zoom, setZoom] = useState(1)
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null)

  const pinchDist = (e: React.TouchEvent) => {
    const a = e.touches[0]
    const b = e.touches[1]
    if (!a || !b) return 0
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
  }

  const clampZoom = (z: number) => Math.min(2.6, Math.max(0.7, z))

  const onPinchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return
    pinchRef.current = { dist: pinchDist(e), zoom }
  }
  const onPinchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinchRef.current) return
    e.preventDefault()
    const d = pinchDist(e)
    if (d === 0) return
    setZoom(clampZoom((pinchRef.current.zoom * d) / pinchRef.current.dist))
  }
  const onPinchEnd = () => {
    pinchRef.current = null
  }

  const cargar = useCallback(async () => {
    setLoading(true)
    const { equipoId: id, disponible: disp } = await obtenerEquipoId()
    setEquipoId(id)
    setDisponible(disp)
    if (id) {
      const m = await obtenerMiembros(id)
      setMiembros(m)
      const v = await obtenerVirtuales(id)
      setVirtuales(v)
      const r = await cargarTurnosMiembros(m, v)
      setRoster(r)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    cargar()
    ;(async () => {
      try {
        const { data } = await supabase.auth.getUser()
        setMyUserId(data.user?.id ?? null)
      } catch {
        /* noop */
      }
    })()
  }, [cargar])

  const planilla: PlanillaMes | null = equipoId ? construirPlanilla(roster, year, month) : null
  const resumen = planilla ? resumenPorDia(planilla) : null

  const handleCrearEquipo = async () => {
    const id = await crearEquipo(nombreEquipo)
    if (id) {
      setMsg('✅ Equipo creado. Ahora agrega o crea usuarios.')
      await cargar()
    } else {
      setMsg('No se pudo crear el equipo. Verifica que ejecutaste supabase/equipo.sql')
    }
  }

  const handleCrearCuenta = async () => {
    if (!nombre.trim() || !email.trim() || password.length < 6) {
      setMsg('Completa nombre, correo y contraseña (mínimo 6 caracteres)')
      return
    }
    if (!equipoId) return
    const r = await crearCuentaYAgregar(equipoId, nombre, email, password)
    setMsg(r.ok ? `✅ Cuenta y equipo: ${r.ok}` : r.error || 'Error')
    if (r.ok) {
      setNombre('')
      setEmail('')
      setPassword('')
      await cargar()
    }
  }

  const handleAgregar = async () => {
    if (!equipoId || !email.trim()) return
    const r = await agregarMiembro(equipoId, email)
    setMsg(r.ok ? '✅ Miembro agregado' : r.error || 'Error')
    if (r.ok) {
      setEmail('')
      await cargar()
    }
  }

  const handleQuitar = async (userId: string) => {
    if (!equipoId) return
    const ok = await quitarMiembro(equipoId, userId)
    setMsg(ok ? 'Miembro eliminado' : 'No se pudo eliminar (¿eres el dueño?)')
    if (ok) await cargar()
  }

  const handleGuardarVirtual = async () => {
    if (!equipoId || !vNombre.trim()) {
      setMsg('Ponle un nombre a la persona')
      return
    }
    let r
    if (editVirtualId) {
      r = await actualizarVirtual(editVirtualId, vNombre, vCiclo, vFecha)
    } else {
      r = await crearVirtual(equipoId, vNombre, vCiclo, vFecha)
    }
    setMsg(r.ok ? (editVirtualId ? '✅ Persona actualizada' : '✅ Persona agregada (sin cuenta)') : r.error || 'Error')
    setVNombre('')
    setEditVirtualId(null)
    await cargar()
  }

  const handleQuitarVirtual = async (id: string) => {
    const ok = await eliminarVirtual(id)
    setMsg(ok ? 'Persona eliminada' : 'No se pudo eliminar')
    if (ok) await cargar()
  }

  const prevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else {
      setMonth((m) => m - 1)
    }
  }
  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else {
      setMonth((m) => m + 1)
    }
  }

  return (
    <div className="space-y-4">
      {/* ─── MENSAJE ─── */}
      {msg && (
        <div className="p-3 rounded-xl border text-sm font-semibold animate-slide-up"
          style={{ backgroundColor: 'rgba(37, 99, 235, 0.08)', color: '#1d4ed8', borderColor: 'rgba(37,99,235,.3)' }}>
          {msg}
        </div>
      )}

      {!disponible && (
        <div className="p-5 rounded-xl border text-sm"
          style={{ backgroundColor: 'rgba(234, 179, 8, 0.08)', color: '#a16207', borderColor: 'rgba(234,179,8,.3)' }}>
          Para activar el modo equipo primero ejecuta en tu Supabase (SQL Editor) el archivo{' '}
          <b>supabase/equipo.sql</b>. Después vuelve a abrir esta pestaña.
        </div>
      )}

      {disponible && !loading && !equipoId && (
        <div className="p-5 rounded-xl shadow-sm border space-y-3"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h3 className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>
            Activar modo equipo
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Tú serás el admin (dueño). Podrás crear cuentas, invitar gente y armar la planilla del mes.
          </p>
          <input
            value={nombreEquipo}
            onChange={(e) => setNombreEquipo(e.target.value)}
            placeholder="Nombre del equipo (ej: Planta 2)"
            className="w-full p-4 rounded-xl outline-none text-sm"
            style={{ backgroundColor: 'var(--bg-body)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
          />
          <button
            onClick={handleCrearEquipo}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg"
          >
            ACTIVAR MODO EQUIPO
          </button>
        </div>
      )}

      {equipoId && (
        <>
          {/* ─── MIEMBROS + CREAR USUARIOS ─── */}
          <div className="p-5 rounded-xl shadow-sm border space-y-4"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h3 className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>
              Mi equipo ({miembros.length})
            </h3>

            {/* Crear cuenta */}
            <div className="space-y-2 border rounded-xl p-3" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2 text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>
                <UserPlus className="w-3.5 h-3.5" /> Crear cuenta nueva
              </div>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del trabajador"
                className="w-full p-3 rounded-xl outline-none text-sm"
                style={{ backgroundColor: 'var(--bg-body)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }} />
              <div className="flex gap-2">
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" type="email"
                  className="flex-1 p-3 rounded-xl outline-none text-sm"
                  style={{ backgroundColor: 'var(--bg-body)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }} />
                <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" type="password"
                  className="flex-1 p-3 rounded-xl outline-none text-sm"
                  style={{ backgroundColor: 'var(--bg-body)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <button onClick={handleCrearCuenta} className="w-full py-3 rounded-xl font-bold text-white transition"
                style={{ backgroundColor: '#2563eb' }}>
                CREAR Y AGREGAR AL EQUIPO
              </button>
              <button onClick={handleAgregar} className="w-full py-3 rounded-xl font-bold transition"
                style={{ backgroundColor: 'rgba(37,99,235,.1)', color: '#2563eb' }}>
                O invitar correo ya registrado
              </button>
            </div>

            {/* Lista */}
            <div className="space-y-2">
              {roster.map((r) => {
                const esOwner = miembros.find((m) => m.user_id === r.id)?.rol === 'owner'
                return (
                  <div key={r.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-body)' }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: 'rgba(37,99,235,.12)', color: '#2563eb' }}>
                        {(r.nombre || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate" style={{ color: 'var(--text-main)' }}>
                          {r.nombre} {esOwner && <span className="text-[9px] text-blue-500 uppercase">· dueño</span>}
                        </div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{r.id.slice(0, 8)}</div>
                      </div>
                    </div>
                    {!esOwner && myUserId !== r.id && (
                      <button onClick={() => handleQuitar(r.id)} className="p-2 rounded-lg"
                        style={{ color: '#ef4444' }} title="Quitar del equipo">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              })}
              {roster.length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                  Sin miembros todavía. Crea la primera cuenta de tu equipo.
                </p>
              )}
            </div>
          </div>

          {/* ─── PERSONAS SIN APP (VIRTUALES) ─── */}
          <div className="p-5 rounded-xl shadow-sm border space-y-4"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h3 className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>
              Personas sin la app
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Agrégales su ciclo de turnos y aparecerán solas en la planilla del mes.
            </p>

            <div className="space-y-2 border rounded-xl p-3" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2 text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>
                <Users className="w-3.5 h-3.5" /> {editVirtualId ? 'Editar persona' : 'Nueva persona'}
              </div>
              <input value={vNombre} onChange={(e) => setVNombre(e.target.value)} placeholder="Nombre (ej: Luis Muñoz)"
                className="w-full p-3 rounded-xl outline-none text-sm"
                style={{ backgroundColor: 'var(--bg-body)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }} />
              <select value={vCiclo} onChange={(e) => setVCiclo(e.target.value)}
                className="w-full p-3 rounded-xl outline-none text-sm"
                style={{ backgroundColor: 'var(--bg-body)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                {Object.entries(CICLOS_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
              <div className="flex gap-2 items-center">
                <label className="text-[10px] font-bold flex-1" style={{ color: 'var(--text-muted)' }}>
                  Inicio del ciclo
                  <input type="date" value={vFecha} onChange={(e) => setVFecha(e.target.value)}
                    className="w-full mt-1 p-3 rounded-xl outline-none text-sm"
                    style={{ backgroundColor: 'var(--bg-body)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }} />
                </label>
                {editVirtualId && (
                  <button onClick={() => { setEditVirtualId(null); setVNombre(''); }}
                    className="p-3 rounded-xl text-xs font-bold"
                    style={{ color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                    Cancelar
                  </button>
                )}
              </div>
              <button onClick={handleGuardarVirtual} className="w-full py-3 rounded-xl font-bold text-white transition"
                style={{ backgroundColor: '#7c3aed' }}>
                {editVirtualId ? 'GUARDAR CAMBIOS' : 'AGREGAR A LA PLANILLA'}
              </button>
            </div>

            <div className="space-y-2">
              {virtuales.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border"
                  style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-body)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: 'rgba(124,58,237,.12)', color: '#7c3aed' }}>
                      {(v.nombre || '?').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate" style={{ color: 'var(--text-main)' }}>{v.nombre}</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {(CICLOS_LABELS[v.ciclo_id] || v.ciclo_id).split(':')[0]} · desde {v.fecha_inicio}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => {
                      setEditVirtualId(v.id)
                      setVNombre(v.nombre)
                      setVCiclo(v.ciclo_id)
                      setVFecha(v.fecha_inicio)
                    }} className="p-2 rounded-lg text-sm" style={{ color: '#2563eb' }} title="Editar">
                      ✏️
                    </button>
                    <button onClick={() => handleQuitarVirtual(v.id)} className="p-2 rounded-lg"
                      style={{ color: '#ef4444' }} title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {virtuales.length === 0 && (
                <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>
                  Todavía no hay personas sin app.
                </p>
              )}
            </div>
          </div>

          {/* ─── PLANILLA DEL MES ─── */}
          <div className="p-4 rounded-xl shadow-sm border print-area planilla"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="print-header">
              <h3 className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>
                PLANILLA DE TURNOS — {MESES[month]} {year}
              </h3>
            </div>

            <div className="no-print flex items-center justify-between mt-1 mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-1">
                <button onClick={prevMonth}
                  className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ color: 'var(--text-muted)' }}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{MESES[month]} {year}</span>
                <button onClick={nextMonth}
                  className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ color: 'var(--text-muted)' }}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <button onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition"
                style={{ backgroundColor: 'rgba(37,99,235,.1)', color: '#2563eb' }}>
                <Printer className="w-4 h-4" /> Imprimir planilla
              </button>
            </div>

            {planilla ? (
              <>
                <div
                  className="overflow-x-auto"
                  style={{ touchAction: pinchRef.current ? 'none' : 'auto' }}
                >
                  <div
                    className="planilla-zoom"
                    onTouchStart={onPinchStart}
                    onTouchMove={onPinchMove}
                    onTouchEnd={onPinchEnd}
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100 / zoom}%` }}
                  >
                    <table className="planilla-tabla" width="100%">
                    <thead>
                      <tr>
                        <th className="pl-nombre">Trabajador</th>
                        {Array.from({ length: planilla.totalDias }, (_, i) => i + 1).map((d) => (
                          <th key={d}
                            className="pl-dia"
                            style={{
                              color: d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
                                ? '#2563eb' : 'var(--text-muted)',
                              fontWeight: 700,
                            }}>
                            {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {planilla.filas.map((fila) => (
                        <tr key={fila.miembroId}>
                          <td className="pl-nombre" style={{ color: 'var(--text-main)' }}>{fila.nombre}</td>
                          {fila.celdas.map((celda, i) => (
                            <td key={i}
                              className="pl-celda"
                              style={{
                                color: celda ? CELDA_COLOR[celda] : 'transparent',
                                backgroundColor: celda ? `${CELDA_COLOR[celda]}1a` : 'transparent',
                              }}>
                              {celda || '·'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                  <div className="flex items-center gap-1 mt-2 no-print">
                    <button
                      onClick={() => setZoom((z) => clampZoom(z - 0.2))}
                      className="w-8 h-8 rounded-lg font-bold text-sm"
                      style={{ backgroundColor: 'rgba(37,99,235,.1)', color: '#2563eb' }}
                      title="Alejar"
                    >
                      −
                    </button>
                    <span className="text-[10px] font-bold px-2" style={{ color: 'var(--text-muted)' }}>
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      onClick={() => setZoom((z) => clampZoom(z + 0.2))}
                      className="w-8 h-8 rounded-lg font-bold text-sm"
                      style={{ backgroundColor: 'rgba(37,99,235,.1)', color: '#2563eb' }}
                      title="Acercar (o usa dos dedos)"
                    >
                      +
                    </button>
                    {zoom !== 1 && (
                      <button
                        onClick={() => setZoom(1)}
                        className="ml-auto px-3 py-1.5 rounded-full text-[10px] font-bold"
                        style={{ backgroundColor: 'rgba(107,114,128,.12)', color: 'var(--text-muted)' }}
                      >
                        Restablecer
                      </button>
                    )}
                    {zoom > 1 && (
                      <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
                        Desliza la tabla para ver más
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-3 text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                  <span style={{ color: CELDA_COLOR.D }}>D = Día</span>
                  <span style={{ color: CELDA_COLOR.N }}>N = Noche</span>
                  <span style={{ color: CELDA_COLOR.DN }}>DN = Mixto</span>
                  <span style={{ color: CELDA_COLOR.V }}>V = Vacaciones</span>
                  <span style={{ color: CELDA_COLOR.AD }}>AD = Admin.</span>
                </div>

                {/* Quién trabaja cada día (resumen) */}
                <div className="print-resumen mt-4">
                  <h4 className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                    Quiénes trabajan cada día
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {resumen?.filter((r) => r.turnos > 0).map((r) => (
                      <div key={r.dia} className="px-2 py-1 rounded-md text-[10px]"
                        style={{ backgroundColor: 'rgba(16,185,129,.07)', color: 'var(--text-main)' }}>
                        <b style={{ color: '#059669' }}>Día {r.dia}</b>: {r.conTurno.map((n) => n.split(' ')[0]).join(', ')}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs py-6 text-center" style={{ color: 'var(--text-muted)' }}>
                Carga la planilla conectando el equipo.
              </p>
            )}
          </div>
        </>
      )}

      {loading && (
        <p className="text-center text-sm py-10" style={{ color: 'var(--text-muted)' }}>Cargando equipo…</p>
      )}
    </div>
  )
}