import { useMemo, useRef } from 'react'
import type { TurnosData, PatronCiclo } from '../types'
import { Lock } from 'lucide-react'
import { obtenerDia } from '../lib/turnos'

interface CalendarGridProps {
  year: number
  month: number
  turnos: TurnosData
  patronActual: PatronCiclo | null
  mesesBorrados: string[]
  onOpenDay: (day: number) => void
  onQuickExtra: (day: number) => void
}

const DAY_LABELS = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO']

export default function CalendarGrid({ year, month, turnos, patronActual, mesesBorrados, onOpenDay, onQuickExtra }: CalendarGridProps) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)

  const clearPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const calendar = useMemo(() => {
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7
    const totalDays = new Date(year, month + 1, 0).getDate()
    const today = new Date()

    const days: {
      day: number
      data: (typeof turnos)[number][number][number] | undefined
      isToday: boolean
    }[] = []

    // Empty slots
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: 0, data: undefined, isToday: false })
    }

    for (let d = 1; d <= totalDays; d++) {
      const data = obtenerDia(turnos, year, month, d, patronActual, mesesBorrados)
      const isToday =
        d === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear()
      days.push({ day: d, data, isToday })
    }

    return days
  }, [year, month, turnos, patronActual])

  return (
    <div className="animate-slide-up">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2 text-center text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
        {DAY_LABELS.map((label, i) => (
          <div key={i} className={i >= 5 ? (i === 6 ? 'text-red-500' : 'text-blue-500') : ''}>
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {calendar.map((item, i) => {
          if (item.day === 0) return <div key={`empty-${i}`} />

          const data = item.data
          let classes = 'day rounded-xl p-1 flex flex-col justify-between cursor-pointer relative'
          if (item.isToday) classes += ' today'
          if (data?.tipo === 'vacaciones') classes += ' vacaciones'
          if (data?.tipo === 'administrativo') classes += ' administrativo'

          return (
            <div
              key={item.day}
              className={classes}
              onClick={() => {
                // Si fue long-press no abrir dos veces
                if (longPressed.current) {
                  longPressed.current = false
                  return
                }
                onOpenDay(item.day)
              }}
              onTouchStart={(e) => {
                clearPress()
                const day = item.day
                pressTimer.current = setTimeout(() => {
                  longPressed.current = true
                  onOpenDay(day)
                }, 600)
              }}
              onTouchMove={() => clearPress()}
              onTouchEnd={() => clearPress()}
              onContextMenu={(e) => {
                e.preventDefault()
                if (longPressed.current) {
                  longPressed.current = false
                  return
                }
                onQuickExtra(item.day)
              }}
              style={{
                backgroundColor: 'var(--day-bg)',
                borderColor: item.isToday ? 'var(--color-primary)' : 'var(--day-border)',
              }}
            >
              {/* Day number + lock icon */}
              <div className="flex justify-between">
                <span
                  className="text-sm font-bold ml-1"
                  style={{
                    color: item.isToday ? 'var(--color-primary)' : 'var(--text-muted)',
                  }}
                >
                  {item.day}
                </span>
                {data?.locked && <Lock className="w-3 h-3 text-gray-400" />}
              </div>

              {/* Badges */}
              {data && (
                <div className="flex flex-col gap-0.5 mt-1">
                  {data.tipo === 'vacaciones' && (
                    <div className="text-[10px] text-yellow-700 dark:text-yellow-300 text-center font-bold bg-yellow-100 dark:bg-yellow-900/30 rounded py-1">
                      VAC
                    </div>
                  )}
                  {data.tipo === 'administrativo' && (
                    <div className="text-[10px] text-blue-700 dark:text-blue-300 text-center font-bold bg-blue-100 dark:bg-blue-900/30 rounded py-1">
                      ADMIN
                    </div>
                  )}
                  {data.turnos && data.turnos.length > 0 && (
                    data.turnos
                      .filter((t) => !(t === 'dia' && data.tipo && data.tipo !== 'turno'))
                      .map((t, idx) => {
                        if (t === 'dia' && data.tipo === 'turno') {
                          return (
                            <span key={idx} className="turno-badge t-dia w-full text-center">
                              DÍA
                            </span>
                          )
                        }
                        let c = 't-dia'
                        if (t.includes('noche')) c = 't-noche'
                        if (t.includes('extra')) c = 't-extra'
                        return (
                          <span key={idx} className={`turno-badge ${c} w-full text-center`}>
                            {t.replace('extra-', '').toUpperCase()}
                          </span>
                        )
                      })
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="no-print text-center text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
        Toca un día para editarlo · Toca y mantén para agregar EXTRA rápido
      </p>
    </div>
  )
}
