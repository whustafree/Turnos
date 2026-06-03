import { Trash2 } from 'lucide-react'
import type { AusenciaGroup } from '../lib/turnos'

interface AusenciasListProps {
  groups: AusenciaGroup[]
  onDelete: (inicioStr: string, finStr: string) => void
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function AusenciasList({ groups, onDelete }: AusenciasListProps) {
  if (groups.length === 0) {
    return (
      <p className="text-center py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        No hay ausencias este año.
      </p>
    )
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
      {groups.map((g, idx) => {
        const inicioStr = `${g.inicio.getFullYear()}-${g.inicio.getMonth() + 1}-${g.inicio.getDate()}`
        const finStr = `${g.fin.getFullYear()}-${g.fin.getMonth() + 1}-${g.fin.getDate()}`

        const isSameDay = g.inicio.getTime() === g.fin.getTime()
        const textoRango = isSameDay
          ? formatDate(g.inicio)
          : `Del ${formatDate(g.inicio)} al ${formatDate(g.fin)}`
        const subtitulo =
          g.tipo === 'vacaciones'
            ? `${g.diasHabiles} días hábiles`
            : 'Día Administrativo'

        const isVacaciones = g.tipo === 'vacaciones'

        return (
          <div
            key={idx}
            className="flex justify-between items-center p-3 rounded-xl shadow-sm border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{
                  backgroundColor: isVacaciones
                    ? 'rgba(234, 179, 8, 0.15)'
                    : 'rgba(37, 99, 235, 0.15)',
                }}
              >
                <span className="text-sm">
                  {isVacaciones ? '🏖️' : '📋'}
                </span>
              </div>

              <div>
                <div
                  className="font-bold text-sm"
                  style={{ color: 'var(--text-main)' }}
                >
                  {isVacaciones ? 'Vacaciones' : 'Administrativo'}
                </div>
                <div
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {textoRango}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {subtitulo}
                </div>
              </div>
            </div>

            <button
              onClick={() => onDelete(inicioStr, finStr)}
              className="transition p-2"
              style={{ color: '#f87171' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
                e.currentTarget.style.borderRadius = '8px'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
