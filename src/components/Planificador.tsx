import { useState } from 'react'
import { listarCiclos, etiquetaCiclo } from '../types'
import type { CicloPaso, PatronCiclo } from '../types'

interface PlanificadorProps {
  year: number
  month: number
  activePattern: PatronCiclo | null
  patrones: PatronCiclo[]
  onApply: (fechaInicio: string, cicloId: string, year: number, month: number) => void
  onSwitch: (patron: PatronCiclo) => void
  onDelete: (patron: PatronCiclo) => void
  onNavigate: (year: number, month: number) => void
  onSaveCiclo?: (id: string, ciclo: { nombre: string; pasos: CicloPaso[] }) => void
  onDeleteCiclo?: (id: string) => void
}

export default function Planificador({ year, month, activePattern, patrones, onApply, onSwitch, onDelete, onNavigate, onSaveCiclo, onDeleteCiclo }: PlanificadorProps) {
  const [cicloId, setCicloId] = useState('10')
  const [fechaInicio, setFechaInicio] = useState('')

  // ─── Creador de ciclos personalizados ───
  const [customNombre, setCustomNombre] = useState('')
  const [customPasos, setCustomPasos] = useState<CicloPaso[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  const ciclos = listarCiclos()

  const PASO_LABEL: Partial<Record<CicloPaso, string>> = {
    dia: 'Día',
    noche: 'Noche',
    descanso: 'Descanso',
  }

  const agregarPaso = (paso: CicloPaso) => setCustomPasos((p) => [...p, paso])
  const quitarUltimo = () => setCustomPasos((p) => p.slice(0, -1))

  const guardarCustom = () => {
    if (!customNombre.trim()) {
      alert('Ponle un nombre al ciclo')
      return
    }
    if (customPasos.length === 0) {
      alert('Agrega al menos un paso')
      return
    }
    const id = editingId || `custom-${Date.now().toString(36)}`
    onSaveCiclo?.(id, { nombre: customNombre.trim(), pasos: customPasos })
    setCustomNombre('')
    setCustomPasos([])
    setEditingId(null)
    setCicloId(id)
  }

  const editarCustom = (id: string, nombre: string, pasos: CicloPaso[]) => {
    setEditingId(id)
    setCustomNombre(nombre)
    setCustomPasos(pasos)
  }

  const handleApply = () => {
    if (!fechaInicio) return alert('Selecciona fecha')
    onApply(fechaInicio, cicloId, year, month)
    alert('Ciclo aplicado.')
  }

  const handleGenerateNextMonth = () => {
    if (!activePattern) return
    const [iy, im, id] = activePattern.fechaInicio.split('-').map(Number)
    const startDate = new Date(iy, im - 1, id)

    let ny = year
    let nm = month + 1
    if (nm > 11) {
      nm = 0
      ny++
    }

    const lastDay = new Date(ny, nm + 1, 0)
    if (lastDay < startDate) return alert('El patrón aún no inicia en ese mes.')

    onApply(activePattern.fechaInicio, activePattern.cicloId, ny, nm)
    onNavigate(ny, nm)
    alert('Mes siguiente generado con el mismo patrón.')
  }

  return (
    <div
      className="p-6 rounded-xl shadow-sm border animate-slide-up"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
      }}
    >
      <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-main)' }}>
        Generador de Turnos 3x3
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
            Ciclo de Trabajo
          </label>
          <select
            value={cicloId}
            onChange={(e) => setCicloId(e.target.value)}
            className="w-full p-4 rounded-xl outline-none"
            style={{
              backgroundColor: 'var(--bg-body)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
            }}
          >
            {ciclos.map(({ id, label }) => (
              <option key={id} value={id}>
                {id}. {label}
              </option>
            ))}
          </select>
        </div>

        {/* ─── CREADOR DE CICLOS PERSONALIZADOS ─── */}
        <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-body)' }}>
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
              {editingId ? '✏️ Editar ciclo' : '➕ Ciclo personalizado'}
            </h4>
            {(customPasos.length > 0 || editingId) && (
              <button
                onClick={() => {
                  setCustomPasos([])
                  setCustomNombre('')
                  setEditingId(null)
                }}
                className="px-2 py-1 rounded-lg text-[10px] font-bold"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
              >
                Limpiar
              </button>
            )}
          </div>

          <input
            value={customNombre}
            onChange={(e) => setCustomNombre(e.target.value)}
            placeholder="Nombre (ej: 3x3 solo día, 6x2…)"
            className="w-full p-3 rounded-xl outline-none text-sm"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
            }}
          />

          <div className="flex gap-2">
            {(['dia', 'noche', 'descanso'] as CicloPaso[]).map((paso) => (
              <button
                key={paso}
                onClick={() => agregarPaso(paso)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition"
                style={{
                  backgroundColor:
                    paso === 'dia'
                      ? 'rgba(5, 150, 105, 0.12)'
                      : paso === 'noche'
                        ? 'rgba(67, 56, 202, 0.12)'
                        : 'rgba(107, 114, 128, 0.12)',
                  color:
                    paso === 'dia'
                      ? '#059669'
                      : paso === 'noche'
                        ? '#4338ca'
                        : 'var(--text-muted)',
                  border: `1px solid ${paso === 'dia' ? '#059669' : paso === 'noche' ? '#4338ca' : 'var(--border-color)'}`,
                }}
              >
                + {PASO_LABEL[paso]}
              </button>
            ))}
          </div>

          {customPasos.length > 0 && (
            <div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {customPasos.map((p, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor:
                        p === 'dia'
                          ? 'rgba(5, 150, 105, 0.15)'
                          : p === 'noche'
                            ? 'rgba(67, 56, 202, 0.15)'
                            : 'rgba(107, 114, 128, 0.15)',
                      color: p === 'dia' ? '#059669' : p === 'noche' ? '#4338ca' : 'var(--text-muted)',
                    }}
                  >
                    {PASO_LABEL[p]}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={quitarUltimo}
                  className="px-3 py-2 rounded-lg text-[10px] font-bold"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                >
                  ← Quitar último
                </button>
                <span className="text-[10px] font-bold ml-auto" style={{ color: 'var(--text-muted)' }}>
                  {customPasos.length} pasos · se repite
                </span>
              </div>
            </div>
          )}

          <button
            onClick={guardarCustom}
            className="w-full py-3 rounded-xl font-bold text-white transition"
            style={{ backgroundColor: '#7c3aed' }}
          >
            {editingId ? 'GUARDAR EDICIÓN' : 'GUARDAR CICLO'}{' '}
            {customPasos.length > 0 && `(${customPasos.length} pasos)`}
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
            Fecha de Inicio del Ciclo
          </label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="w-full p-4 rounded-xl outline-none"
            style={{
              backgroundColor: 'var(--bg-body)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
            }}
          />
        </div>

        <button
          onClick={handleApply}
          className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition"
        >
          APLICAR CICLO
        </button>

        {activePattern && (
          <button
            onClick={handleGenerateNextMonth}
            className="w-full py-4 font-bold rounded-xl transition"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#059669',
              border: '2px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            AUTO-GENERAR MES SIGUIENTE ►
          </button>
        )}

        {/* ═══ MIS CICLOS GUARDADOS ═══ */}
        {patrones.length > 0 && (
          <div className="pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <h4 className="font-bold text-sm mb-2 mt-3" style={{ color: 'var(--text-muted)' }}>
              Mis ciclos guardados
            </h4>
            <div className="space-y-2">
              {patrones.map((p) => {
                const isActive =
                  activePattern?.fechaInicio === p.fechaInicio &&
                  activePattern?.cicloId === p.cicloId
                const label = etiquetaCiclo(p.cicloId)
                const customCiclos = p.cicloId.startsWith('custom')
                return (
                  <div
                    key={`${p.cicloId}-${p.fechaInicio}`}
                    className="flex items-center justify-between gap-2 p-3 rounded-xl border"
                    style={{
                      borderColor: isActive ? 'var(--color-primary)' : 'var(--border-color)',
                      backgroundColor: isActive ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-body)',
                    }}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate" style={{ color: 'var(--text-main)' }}>
                        {label ? label.split(':')[0] : p.cicloId} {isActive && '● ACTIVO'}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        Inicia: {p.fechaInicio} · {p.cicloId}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isActive && (
                        <button
                          onClick={() => onSwitch(p)}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition"
                          style={{
                            backgroundColor: 'rgba(37, 99, 235, 0.12)',
                            color: '#2563eb',
                          }}
                        >
                          Usar
                        </button>
                      )}
                      {customCiclos && onDeleteCiclo && (
                        <button
                          onClick={() => onDeleteCiclo(p.cicloId)}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition"
                          style={{
                            backgroundColor: 'rgba(168, 85, 247, 0.12)',
                            color: '#7c3aed',
                          }}
                        >
                          Borrar ciclo
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(p)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
