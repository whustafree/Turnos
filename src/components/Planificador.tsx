import { useState } from 'react'
import { CICLOS_LABELS } from '../types'
import type { PatronCiclo } from '../types'

interface PlanificadorProps {
  year: number
  month: number
  activePattern: PatronCiclo | null
  patrones: PatronCiclo[]
  onApply: (fechaInicio: string, cicloId: string, year: number, month: number) => void
  onSwitch: (patron: PatronCiclo) => void
  onDelete: (patron: PatronCiclo) => void
  onNavigate: (year: number, month: number) => void
}

export default function Planificador({ year, month, activePattern, patrones, onApply, onSwitch, onDelete, onNavigate }: PlanificadorProps) {
  const [cicloId, setCicloId] = useState('10')
  const [fechaInicio, setFechaInicio] = useState('')

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
            {Object.entries(CICLOS_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {id}. {label}
              </option>
            ))}
          </select>
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
                const label = CICLOS_LABELS[p.cicloId]
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
