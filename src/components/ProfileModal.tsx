import { useState, useEffect } from 'react'
import { X, LogOut } from 'lucide-react'

interface ProfileModalProps {
  isOpen: boolean
  profile: {
    nombre: string
    cargo: string
    empresa: string
    adminTotal: number
    vacacionesLey: number
    vacacionesSindicato: number
    vacacionesTotal: number
    patronActual: { fechaInicio: string; cicloId: string } | null
    mesesBorrados: string[]
  }
  onSave: (data: Partial<ProfileModalProps['profile']>) => void
  onLogout: () => void
  onClose: () => void
}

export default function ProfileModal({ isOpen, profile, onSave, onLogout, onClose }: ProfileModalProps) {
  const [nombre, setNombre] = useState('')
  const [cargo, setCargo] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [adminTotal, setAdminTotal] = useState(6)
  const [vacacionesLey, setVacacionesLey] = useState(15)
  const [vacacionesSindicato, setVacacionesSindicato] = useState(2)
  const vacacionesTotal = vacacionesLey + vacacionesSindicato

  useEffect(() => {
    if (isOpen) {
      setNombre(profile.nombre)
      setCargo(profile.cargo)
      setEmpresa(profile.empresa)
      setAdminTotal(profile.adminTotal)
      setVacacionesLey(profile.vacacionesLey)
      setVacacionesSindicato(profile.vacacionesSindicato)
    }
  }, [isOpen, profile])

  if (!isOpen) return null

  const handleSave = () => {
    onSave({ nombre, cargo, empresa, adminTotal, vacacionesLey, vacacionesSindicato, vacacionesTotal })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-slide-up border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>
            Editar Perfil
          </h3>
          <button onClick={onClose} className="transition" style={{ color: 'var(--text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
              Nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full p-3 rounded-lg outline-none"
              style={{
                backgroundColor: 'var(--bg-body)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
              Días Admin
            </label>
            <input
              type="number"
              value={adminTotal}
              onChange={(e) => setAdminTotal(Number(e.target.value))}
              className="w-full p-3 rounded-lg outline-none"
              style={{
                backgroundColor: 'var(--bg-body)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
              }}
              placeholder="Ej: 5"
              min={0}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
                Vac. por Ley
              </label>
              <input
                type="number"
                value={vacacionesLey}
                onChange={(e) => setVacacionesLey(Number(e.target.value))}
                className="w-full p-3 rounded-lg outline-none"
                style={{
                  backgroundColor: 'var(--bg-body)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                }}
                placeholder="Ej: 15"
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
                Vac. Sindicato
              </label>
              <input
                type="number"
                value={vacacionesSindicato}
                onChange={(e) => setVacacionesSindicato(Number(e.target.value))}
                className="w-full p-3 rounded-lg outline-none"
                style={{
                  backgroundColor: 'var(--bg-body)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                }}
                placeholder="Ej: 2"
                min={0}
              />
            </div>
          </div>

          {/* Total Vacaciones calculado */}
          <div
            className="p-3 rounded-xl text-center"
            style={{ backgroundColor: 'rgba(234, 179, 8, 0.08)' }}
          >
            <span className="text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>
              Total Vacaciones: {vacacionesTotal} días
            </span>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {vacacionesLey} (Ley) + {vacacionesSindicato} (Sindicato)
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
              Cargo
            </label>
            <input
              type="text"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className="w-full p-3 rounded-lg outline-none"
              style={{
                backgroundColor: 'var(--bg-body)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
              Empresa
            </label>
            <input
              type="text"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              className="w-full p-3 rounded-lg outline-none"
              style={{
                backgroundColor: 'var(--bg-body)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
              }}
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl mt-2 hover:bg-blue-700 transition"
          >
            GUARDAR
          </button>

          <button
            onClick={onLogout}
            className="w-full py-3 rounded-xl font-bold mt-2 border transition flex items-center justify-center gap-2"
            style={{
              color: '#ef4444',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
            }}
          >
            <LogOut className="w-4 h-4" /> CERRAR SESIÓN
          </button>
        </div>
      </div>
    </div>
  )
}
