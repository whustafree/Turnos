import { X } from 'lucide-react'
import type { TurnoTipo, TurnosData } from '../types'

interface TurnoModalProps {
  isOpen: boolean
  day: number | null
  year: number
  month: number
  turnos: TurnosData
  onAddTurno: (year: number, month: number, day: number, tipo: TurnoTipo) => void
  onMarcarAdmin: (year: number, month: number, day: number) => void
  onRemove: (year: number, month: number, day: number) => void
  onClose: () => void
}

export default function TurnoModal({
  isOpen,
  day,
  year,
  month,
  turnos,
  onAddTurno,
  onMarcarAdmin,
  onRemove,
  onClose,
}: TurnoModalProps) {
  if (!isOpen || day === null) return null

  const dayData = turnos[year]?.[month]?.[day]
  const isLocked = dayData?.locked

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="p-6 rounded-2xl w-full max-w-xs shadow-2xl animate-slide-up border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>
            Día <span className="text-blue-600">{day}</span>
          </h3>
          <button onClick={onClose} className="transition" style={{ color: 'var(--text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLocked && (
          <p className="text-xs text-amber-600 mb-3 font-medium">🔒 Día bloqueado</p>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => onAddTurno(year, month, day, 'dia')}
            disabled={isLocked}
            className="p-3 rounded-lg font-bold text-sm transition disabled:opacity-40"
            style={{
              backgroundColor: 'rgba(234, 179, 8, 0.15)',
              color: '#a16207',
              border: '1px solid rgba(234, 179, 8, 0.3)',
            }}
          >
            DÍA
          </button>
          <button
            onClick={() => onAddTurno(year, month, day, 'noche')}
            disabled={isLocked}
            className="p-3 rounded-lg font-bold text-sm transition disabled:opacity-40"
            style={{
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              color: '#4338ca',
              border: '1px solid rgba(99, 102, 241, 0.3)',
            }}
          >
            NOCHE
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => onAddTurno(year, month, day, 'extra-dia')}
            disabled={isLocked}
            className="p-2 rounded-lg font-bold text-xs transition disabled:opacity-40"
            style={{
              backgroundColor: 'rgba(249, 115, 22, 0.15)',
              color: '#c2410c',
              border: '1px solid rgba(249, 115, 22, 0.3)',
            }}
          >
            EXTRA DÍA
          </button>
          <button
            onClick={() => onAddTurno(year, month, day, 'extra-noche')}
            disabled={isLocked}
            className="p-2 rounded-lg font-bold text-xs transition disabled:opacity-40"
            style={{
              backgroundColor: 'rgba(168, 85, 247, 0.15)',
              color: '#7e22ce',
              border: '1px solid rgba(168, 85, 247, 0.3)',
            }}
          >
            EXTRA NOCHE
          </button>
        </div>

        <button
          onClick={() => onMarcarAdmin(year, month, day)}
          disabled={isLocked}
          className="w-full mb-4 p-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-40"
          style={{
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            color: '#2563eb',
            border: '1px solid rgba(37, 99, 235, 0.2)',
          }}
        >
          📋 DÍA ADMIN
        </button>

        <div className="pt-3 mt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={() => onRemove(year, month, day)}
            className="w-full p-2 rounded-lg font-bold text-sm transition"
            style={{ color: '#ef4444' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            Borrar Eventos
          </button>
        </div>
      </div>
    </div>
  )
}
