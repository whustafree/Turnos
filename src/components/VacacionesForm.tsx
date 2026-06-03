import { useState } from 'react'
import { generarCartaVacaciones } from '../lib/turnos'

interface VacacionesFormProps {
  onSave: (startDate: Date, endDate: Date, aprobado: boolean) => void
  userName: string
}

export default function VacacionesForm({ onSave, userName }: VacacionesFormProps) {
  const [startStr, setStartStr] = useState('')
  const [endStr, setEndStr] = useState('')
  const [aprobado, setAprobado] = useState(false)

  const handleSave = () => {
    if (!startStr || !endStr) return
    const start = new Date(startStr)
    const end = new Date(endStr)
    if (end < start) return alert('Fechas incorrectas')
    onSave(start, end, aprobado)
    setStartStr('')
    setEndStr('')
    setAprobado(false)
    alert('Vacaciones guardadas.')
  }

  const handleCarta = () => {
    if (!startStr || !endStr) return alert('Selecciona fechas')
    const start = new Date(startStr)
    const end = new Date(endStr)
    const texto = generarCartaVacaciones(start, end, userName)
    navigator.clipboard.writeText(texto).then(() => alert('Carta copiada!'))
  }

  return (
    <div
      className="p-6 mb-6 rounded-xl shadow-sm"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderLeft: '4px solid #eab308',
        borderColor: 'var(--border-color)',
      }}
    >
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
        <span className="text-yellow-500">✚</span> Registrar Vacaciones
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-bold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
            Desde
          </label>
          <input
            type="date"
            value={startStr}
            onChange={(e) => setStartStr(e.target.value)}
            className="w-full p-3 rounded-xl outline-none"
            style={{
              backgroundColor: 'var(--bg-body)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
            }}
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
            Hasta
          </label>
          <input
            type="date"
            value={endStr}
            onChange={(e) => setEndStr(e.target.value)}
            className="w-full p-3 rounded-xl outline-none"
            style={{
              backgroundColor: 'var(--bg-body)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>
        <input
          type="checkbox"
          checked={aprobado}
          onChange={(e) => setAprobado(e.target.checked)}
          className="w-5 h-5 rounded cursor-pointer"
        />
        <div>
          <label className="text-sm font-bold cursor-pointer" style={{ color: 'var(--text-main)' }}>
            Ya están aprobadas
          </label>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Bloqueará los días en el calendario.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 py-3 bg-yellow-500 text-white font-bold rounded-xl hover:bg-yellow-600 shadow-md transition"
        >
          GUARDAR PERIODO
        </button>
        <button
          onClick={handleCarta}
          className="px-4 py-3 font-bold rounded-xl shadow-sm transition"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
          }}
          title="Copiar carta para Jefatura"
        >
          📩 Carta
        </button>
      </div>
    </div>
  )
}
