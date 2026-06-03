import { Settings, Sun, Umbrella, Calculator, Users } from 'lucide-react'

interface AdminConfigPanelProps {
  adminTotal: number
  vacacionesLey: number
  vacacionesSindicato: number
  vacacionesTotal: number
  adminUsados: number
  vacacionesUsadas: number
  onSave: (data: {
    adminTotal: number
    vacacionesLey: number
    vacacionesSindicato: number
    vacacionesTotal: number
  }) => void
}

export default function AdminConfigPanel({
  adminTotal,
  vacacionesLey,
  vacacionesSindicato,
  vacacionesTotal,
  adminUsados,
  vacacionesUsadas,
  onSave,
}: AdminConfigPanelProps) {
  const handleLeyChange = (val: number) => {
    const ley = Math.max(0, val)
    onSave({
      adminTotal,
      vacacionesLey: ley,
      vacacionesSindicato,
      vacacionesTotal: ley + vacacionesSindicato,
    })
  }

  const handleSindicatoChange = (val: number) => {
    const sind = Math.max(0, val)
    onSave({
      adminTotal,
      vacacionesLey,
      vacacionesSindicato: sind,
      vacacionesTotal: vacacionesLey + sind,
    })
  }

  const handleAdminChange = (val: number) => {
    onSave({
      adminTotal: Math.max(0, val),
      vacacionesLey,
      vacacionesSindicato,
      vacacionesTotal,
    })
  }

  const adminRestantes = Math.max(0, adminTotal - adminUsados)
  const vacRestantes = Math.max(0, vacacionesTotal - vacacionesUsadas)

  return (
    <div className="space-y-5 animate-slide-up">
      {/* ═══ ENCABEZADO ═══ */}
      <div
        className="p-5 rounded-2xl border shadow-sm"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(99, 102, 241, 0.12)' }}>
            <Settings className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>
              Configuración de Días
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Personaliza tus días según tu contrato y convenio colectivo
            </p>
          </div>
        </div>

        {/* ─── DÍAS ADMINISTRATIVOS ─── */}
        <div
          className="p-4 rounded-xl mb-4 border"
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.04)',
            borderColor: 'rgba(59, 130, 246, 0.15)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)' }}>
                <Umbrella className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                  Días Administrativos
                </span>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Días que puedes solicitar para trámites personales
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-[11px] font-bold uppercase mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Total disponibles
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleAdminChange(adminTotal - 1)}
                  className="w-9 h-9 rounded-lg font-bold text-lg flex items-center justify-center transition"
                  style={{
                    backgroundColor: 'var(--bg-body)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                  }}
                >
                  −
                </button>
                <span
                  className="text-2xl font-extrabold min-w-[3rem] text-center tabular-nums"
                  style={{ color: '#2563eb' }}
                >
                  {adminTotal}
                </span>
                <button
                  onClick={() => handleAdminChange(adminTotal + 1)}
                  className="w-9 h-9 rounded-lg font-bold text-lg flex items-center justify-center transition"
                  style={{
                    backgroundColor: 'var(--bg-body)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-3">
              <div className="text-center px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.06)' }}>
                <div className="text-xs font-bold text-red-500">{adminUsados}</div>
                <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Usados
                </div>
              </div>
              <div className="text-center px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.06)' }}>
                <div className="text-xs font-bold text-green-500">{adminRestantes}</div>
                <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Restan
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full mt-3" style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (adminUsados / (adminTotal || 1)) * 100)}%`,
                backgroundColor: adminUsados >= adminTotal ? '#ef4444' : '#3b82f6',
              }}
            />
          </div>
        </div>

        {/* ─── VACACIONES ─── */}
        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: 'rgba(234, 179, 8, 0.04)',
            borderColor: 'rgba(234, 179, 8, 0.15)',
          }}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(234, 179, 8, 0.12)' }}>
              <Sun className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
              Vacaciones
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Por Ley */}
            <div
              className="p-3.5 rounded-xl border"
              style={{
                backgroundColor: 'var(--bg-body)',
                borderColor: 'var(--border-color)',
              }}
            >
              <label className="block text-[10px] font-bold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                Por Ley
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleLeyChange(vacacionesLey - 1)}
                  className="w-8 h-8 rounded-lg font-bold flex items-center justify-center transition"
                  style={{
                    backgroundColor: 'rgba(234, 179, 8, 0.1)',
                    border: '1px solid rgba(234, 179, 8, 0.2)',
                    color: '#a16207',
                  }}
                >
                  −
                </button>
                <span
                  className="text-xl font-extrabold min-w-[2.5rem] text-center tabular-nums"
                  style={{ color: '#ca8a04' }}
                >
                  {vacacionesLey}
                </span>
                <button
                  onClick={() => handleLeyChange(vacacionesLey + 1)}
                  className="w-8 h-8 rounded-lg font-bold flex items-center justify-center transition"
                  style={{
                    backgroundColor: 'rgba(234, 179, 8, 0.1)',
                    border: '1px solid rgba(234, 179, 8, 0.2)',
                    color: '#a16207',
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Del Sindicato */}
            <div
              className="p-3.5 rounded-xl border"
              style={{
                backgroundColor: 'var(--bg-body)',
                borderColor: 'var(--border-color)',
              }}
            >
              <label className="block text-[10px] font-bold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                Del Sindicato
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSindicatoChange(vacacionesSindicato - 1)}
                  className="w-8 h-8 rounded-lg font-bold flex items-center justify-center transition"
                  style={{
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    border: '1px solid rgba(168, 85, 247, 0.2)',
                    color: '#7e22ce',
                  }}
                >
                  −
                </button>
                <span
                  className="text-xl font-extrabold min-w-[2.5rem] text-center tabular-nums"
                  style={{ color: '#7e22ce' }}
                >
                  {vacacionesSindicato}
                </span>
                <button
                  onClick={() => handleSindicatoChange(vacacionesSindicato + 1)}
                  className="w-8 h-8 rounded-lg font-bold flex items-center justify-center transition"
                  style={{
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    border: '1px solid rgba(168, 85, 247, 0.2)',
                    color: '#7e22ce',
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Totales y resumen */}
          <div
            className="p-4 rounded-xl mb-3"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>
                  Total Vacaciones
                </span>
              </div>
              <span className="text-2xl font-extrabold tabular-nums" style={{ color: '#ca8a04' }}>
                {vacacionesTotal}
                <span className="text-sm font-normal ml-1" style={{ color: 'var(--text-muted)' }}>
                  días
                </span>
              </span>
            </div>
            <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
              {vacacionesLey} (Ley) + {vacacionesSindicato} (Sindicato) = {vacacionesTotal} total
            </p>
          </div>

          {/* Stats rápidas */}
          <div className="flex gap-3">
            <div
              className="flex-1 text-center p-3 rounded-xl border"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                borderColor: 'rgba(239, 68, 68, 0.15)',
              }}
            >
              <div className="text-lg font-extrabold text-red-500 tabular-nums">{vacacionesUsadas}</div>
              <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Usados
              </div>
            </div>
            <div
              className="flex-1 text-center p-3 rounded-xl border"
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.05)',
                borderColor: 'rgba(34, 197, 94, 0.15)',
              }}
            >
              <div className="text-lg font-extrabold text-green-500 tabular-nums">{vacRestantes}</div>
              <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Restantes
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 rounded-full mt-3" style={{ backgroundColor: 'rgba(234, 179, 8, 0.12)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (vacacionesUsadas / (vacacionesTotal || 1)) * 100)}%`,
                background: `linear-gradient(90deg, #eab308, ${vacacionesUsadas >= vacacionesTotal ? '#ef4444' : '#f59e0b'})`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ═══ INFO CARD ═══ */}
      <div
        className="p-4 rounded-xl border text-xs leading-relaxed"
        style={{
          backgroundColor: 'rgba(99, 102, 241, 0.04)',
          borderColor: 'rgba(99, 102, 241, 0.12)',
        }}
      >
        <div className="flex items-start gap-2.5">
          <Users className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
          <p style={{ color: 'var(--text-muted)' }}>
            Estos valores se guardan automáticamente en la nube (Supabase) y se sincronizan
            con tu perfil. Ajústalos según tu contrato y convenio colectivo.
          </p>
        </div>
      </div>
    </div>
  )
}
