import { useState } from 'react'
import { CICLOS_LABELS } from '../types'

interface PlanificadorProps {
  year: number
  month: number
  onApply: (fechaInicio: string, cicloId: string, year: number, month: number) => void
}

export default function Planificador({ year, month, onApply }: PlanificadorProps) {
  const [cicloId, setCicloId] = useState('1')
  const [fechaInicio, setFechaInicio] = useState('')

  const handleApply = () => {
    if (!fechaInicio) return alert('Selecciona fecha')
    onApply(fechaInicio, cicloId, year, month)
    alert('Ciclo aplicado.')
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
      </div>
    </div>
  )
}
