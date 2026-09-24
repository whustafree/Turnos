import { useMemo } from 'react'
import type { TurnosData, PatronCiclo } from '../types'
import { obtenerDia } from '../lib/turnos'
import { nombreFeriado, etiquetaTurnoDia } from '../lib/feriados'

interface WeekStripProps {
  turnos: TurnosData
  patronActual: PatronCiclo | null
  mesesBorrados: string[]
  onSelectDay: (date: Date) => void
}

const DIAS_CORTOS = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO']

function colorDeEtiqueta(etiqueta: string): string {
  if (etiqueta === 'DÍA' || etiqueta === 'DN') return '#059669'
  if (etiqueta === 'NOCHE') return '#4338ca'
  if (etiqueta === 'Vacaciones') return '#ca8a04'
  if (etiqueta === 'Administrativo') return '#2563eb'
  return 'var(--text-muted)'
}

function badgePara(etiqueta: string) {
  if (etiqueta === 'DÍA') return 'D'
  if (etiqueta === 'NOCHE') return 'N'
  if (etiqueta === 'DN') return 'DN'
  if (etiqueta === 'Vacaciones') return 'VAC'
  if (etiqueta === 'Administrativo') return 'ADM'
  return '—'
}

export default function WeekStrip({ turnos, patronActual, mesesBorrados, onSelectDay }: WeekStripProps) {
  const hoy = new Date()
  const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7))

  const dias = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i)
      const data = obtenerDia(turnos, d.getFullYear(), d.getMonth(), d.getDate(), patronActual, mesesBorrados)
      const feriado = nombreFeriado(d)
      const etiqueta = etiquetaTurnoDia(data ?? null)
      return { d, data, feriado, etiqueta }
    })
  }, [turnos, patronActual, mesesBorrados, lunes])

  return (
    <div className="mb-3 no-print">
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
        Vista de semana
      </div>
      <div className="grid grid-cols-7 gap-1">
        {dias.map(({ d, feriado, etiqueta }, i) => {
          const esHoy = d.toDateString() === hoy.toDateString()
          const esFin = i >= 5
          return (
            <button
              key={i}
              onClick={() => onSelectDay(d)}
              className="rounded-xl border px-0.5 py-1.5 text-center relative flex flex-col items-center"
              style={{
                borderColor: esHoy ? 'var(--color-primary)' : 'var(--day-border)',
                backgroundColor: esHoy ? 'var(--day-today-bg)' : 'var(--day-bg)',
                opacity: esFin ? (esHoy ? 1 : 0.65) : 1,
              }}
            >
              <span className="text-[8px] font-bold" style={{ color: 'var(--text-muted)' }}>
                {DIAS_CORTOS[i]}
              </span>
              <span className="text-sm font-bold" style={{ color: esHoy ? 'var(--color-primary)' : 'var(--text-main)' }}>
                {d.getDate()}
              </span>
              <span
                className="mt-0.5 text-[9px] font-bold rounded px-1 flex items-center justify-center min-w-7"
                style={{ backgroundColor: colorDeEtiqueta(etiqueta), color: '#fff' }}
              >
                {badgePara(etiqueta)}
              </span>
              {feriado && (
                <span className="text-[6px] font-semibold mt-0.5 leading-tight truncate w-full px-0.5" style={{ color: '#dc2626' }}>
                  {feriado}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}