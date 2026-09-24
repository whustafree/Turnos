import { useMemo, useState } from 'react'
import { Calculator, Download, Upload, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react'
import { exportarJSON, exportarCSV, importarJSON, calcularStatsAnuales, calcularStatsMensuales, calcularProyeccionAnual, HORAS_POR_TURNO } from '../lib/turnos'
import type { DashboardStats, TurnosData } from '../types'

interface DashboardProps {
  stats: DashboardStats
  userName: string
  userCargo: string
  userEmpresa: string
  onOpenProfile: () => void
  onGoCalendar: () => void
  turnos: TurnosData
  profile: {
    nombre: string
    cargo: string
    empresa: string
    adminTotal: number
    vacacionesLey: number
    vacacionesSindicato: number
    vacacionesTotal: number
    patronActual: { fechaInicio: string; cicloId: string } | null
    patrones: { fechaInicio: string; cicloId: string }[]
    mesesBorrados: string[]
  }
  onImport: (turnos: TurnosData, perfil: DashboardProps['profile']) => void
}

export default function Dashboard({ stats, userName, userCargo, userEmpresa, onOpenProfile, onGoCalendar, turnos, profile, onImport }: DashboardProps) {
  const iniciales = (userName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

  const year = new Date().getFullYear()
  const anual = calcularStatsAnuales(turnos, year)
  const meses = useMemo(() => calcularStatsMensuales(turnos, year), [turnos, year])
  const proyeccion = useMemo(() => calcularProyeccionAnual(turnos, year), [turnos, year])
  const [showMeses, setShowMeses] = useState(false)
  const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  const adminPercent = Math.min(100, (stats.adminUsados / (stats.adminTotal || 1)) * 100)
  const vacPercent = Math.min(100, (stats.vacacionesUsadas / (stats.vacacionesTotal || 1)) * 100)

  const adminRestantes = Math.max(0, stats.adminTotal - stats.adminUsados)
  const vacRestantes = Math.max(0, stats.vacacionesTotal - stats.vacacionesUsadas)

  // ─── Export handlers ───
  const handleExportJSON = () => {
    const json = exportarJSON(turnos, profile)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `turnos-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = () => {
    const year = new Date().getFullYear()
    const csv = exportarCSV(turnos, year)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `turnos-${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const result = importarJSON(ev.target?.result as string)
        if (!result) {
          alert('Archivo inválido')
          return
        }
        onImport(result.turnos, result.perfil)
        alert('Datos importados correctamente')
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div
      className="card p-5 flex flex-col md:flex-row items-center md:items-start gap-5 relative overflow-hidden rounded-2xl shadow-sm border"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Decorative circle */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-bl-full pointer-events-none"
        style={{
          backgroundColor: 'rgba(37, 99, 235, 0.05)',
        }}
      />

      <div className="relative z-10 cursor-pointer" onClick={onOpenProfile}>
        <div
          className="w-20 h-20 text-2xl shadow-lg flex items-center justify-center rounded-full bg-blue-600 text-white border-4"
          style={{ borderColor: 'var(--bg-card)' }}
        >
          {iniciales}
        </div>
      </div>

      <div className="text-center md:text-left flex-1 relative z-10 w-full">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
          {userName || 'Usuario'}
        </h2>
        <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
          {userCargo || 'Cargo'} en {userEmpresa || 'Empresa'}
        </p>

        {/* ═══ STATS CARDS ═══ */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          {/* Admin Card */}
          <div className="p-3 rounded-xl border" style={{
            backgroundColor: 'rgba(37, 99, 235, 0.05)',
            borderColor: 'rgba(37, 99, 235, 0.2)',
          }}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold uppercase" style={{ color: '#1e40af' }}>
                ADMIN
              </span>
            </div>
            <div className="text-xl font-bold" style={{ color: '#1d4ed8' }}>
              {stats.adminUsados}
              <span className="text-sm font-normal">/{stats.adminTotal}</span>
            </div>
            <div className="text-[9px] font-semibold" style={{ color: adminRestantes > 0 ? '#22c55e' : '#ef4444' }}>
              {adminRestantes > 0 ? `${adminRestantes} disponibles` : 'Sin disponibles'}
            </div>
            <div className="w-full h-1.5 rounded-full mt-1" style={{ backgroundColor: 'rgba(37, 99, 235, 0.2)' }}>
              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${adminPercent}%` }} />
            </div>
          </div>

          {/* Vacaciones Card */}
          <div className="p-3 rounded-xl border" style={{
            backgroundColor: 'rgba(234, 179, 8, 0.05)',
            borderColor: 'rgba(234, 179, 8, 0.2)',
          }}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold uppercase" style={{ color: '#a16207' }}>
                VACACIONES
              </span>
            </div>
            <div className="text-xl font-bold" style={{ color: '#ca8a04' }}>
              {stats.vacacionesUsadas}
              <span className="text-sm font-normal">/{stats.vacacionesTotal}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Calculator className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
              <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                {stats.vacacionesLey} Ley + {stats.vacacionesSindicato} Sind.
              </span>
            </div>
            <div className="text-[9px] font-semibold" style={{ color: vacRestantes > 0 ? '#22c55e' : '#ef4444' }}>
              {vacRestantes > 0 ? `${vacRestantes} restantes` : 'Sin disponibles'}
            </div>
            {vacRestantes > 0 && (
              <div className="text-[8px] mt-0.5" style={{ color: '#d97706' }}>
                ⏳ Proyección: vencen el 31 dic — planifícalas
              </div>
            )}
            <div className="w-full h-1.5 rounded-full mt-1" style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)' }}>
              <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${vacPercent}%` }} />
            </div>
          </div>
        </div>

        {/* ═══ EXPORT / IMPORT BUTTONS ═══ */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            onClick={onGoCalendar}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#059669',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <CalendarDays className="w-3 h-3" />
            Calendario
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#059669',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <Download className="w-3 h-3" />
            JSON
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: '#2563eb',
              border: '1px solid rgba(59, 130, 246, 0.2)',
            }}
          >
            <Download className="w-3 h-3" />
            CSV
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition"
            style={{
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              color: '#7c3aed',
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }}
          >
            <Upload className="w-3 h-3" />
            Importar
          </button>
        </div>

        {/* ═══ ESTADÍSTICAS ANUALES ═══ */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            { label: 'DÍAS', value: anual.dias, color: '#059669' },
            { label: 'NOCHES', value: anual.noches, color: '#4338ca' },
            { label: 'EXTRAS', value: anual.extrasDia + anual.extrasNoche, color: '#d97706' },
            { label: 'TOTAL', value: anual.diasTrabajados, color: 'var(--text-main)' },
          ].map((c) => (
            <div key={c.label} className="p-2 rounded-xl border text-center" style={{ borderColor: 'var(--border-color)' }}>
              <div className="text-base font-bold" style={{ color: c.color }}>{c.value}</div>
              <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* ═══ PROYECCIÓN ANUAL ═══ */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="p-2 rounded-xl border text-center" style={{ borderColor: 'var(--border-color)' }}>
            <div className="text-base font-bold tabular-nums" style={{ color: 'var(--color-primary)' }}>
              ≈{proyeccion.diasTrabajados} <span className="text-[9px] font-semibold">días/año</span>
            </div>
            <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Proyección {year}
            </div>
          </div>
          <div className="p-2 rounded-xl border text-center" style={{ borderColor: 'var(--border-color)' }}>
            <div className="text-base font-bold tabular-nums" style={{ color: 'var(--color-primary)' }}>
              ≈{proyeccion.horas} <span className="text-[9px] font-semibold">hrs/año</span>
            </div>
            <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {HORAS_POR_TURNO}hrs/turno
            </div>
          </div>
        </div>

        {/* ═══ RESUMEN MENSUAL ═══ */}
        <div className="mt-3">
          <button
            onClick={() => setShowMeses((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl border font-bold text-xs"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-body)', color: 'var(--text-main)' }}
          >
            <span>📊 Turnos por mes ({year})</span>
            {showMeses ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showMeses && (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {meses.map((s) => (
                <div key={s.mes} className="p-2 rounded-xl border text-center" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="text-[9px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>
                    {MESES_CORTOS[s.mes]}
                  </div>
                  <div className="flex items-center justify-center gap-1 font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                    <span className="text-[10px]" style={{ color: '#059669' }}>{s.dias}D</span>
                    <span className="text-[10px]" style={{ color: '#4338ca' }}>{s.noches}N</span>
                    <span className="text-[10px]" style={{ color: '#7c3aed' }}>{s.mixtos}DN</span>
                  </div>
                  <div className="text-[8px]" style={{ color: 'var(--text-muted)' }}>
                    {s.diasTrabajados} días · {s.horas} hs
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
