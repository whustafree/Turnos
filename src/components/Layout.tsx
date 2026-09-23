import { Sun, Moon, LogOut, User, Layers, Download } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import { useInstallPWA } from '../hooks/useInstallPWA'

interface LayoutProps {
  children: React.ReactNode
  userName: string
  isOnline: boolean
  onOpenProfile: () => void
  onLogout: () => void
}

export default function Layout({ children, userName, isOnline, onOpenProfile, onLogout }: LayoutProps) {
  const { isDark, toggle } = useTheme()
  const { install, canInstall, isInstalled, isIOS } = useInstallPWA()

  const iniciales = (userName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

  return (
    <>
      {/* Header */}
      <header
        className="fixed top-0 w-full z-40 px-4 flex justify-between items-center shadow-sm border-b"
        style={{
          backgroundColor: 'var(--header-bg)',
          borderColor: 'var(--border-color)',
          paddingTop: 'max(0.6rem, env(safe-area-inset-top, 0px))',
          paddingBottom: '0.6rem',
          height: 'calc(3.6rem + env(safe-area-inset-top, 0px))',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
            <Layers className="w-4 h-4" />
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ color: 'var(--text-main)' }}>
            TurnosApp
          </span>
          {/* Online/Offline indicator */}
          <div
            className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all ${
              isOnline ? 'text-green-600' : 'text-red-500'
            }`}
            style={{
              backgroundColor: isOnline ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: isOnline ? '#22c55e' : '#ef4444',
              }}
            />
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Instalar App - only show when can be installed */}
          {canInstall && !isInstalled && (
            <button
              onClick={install}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-all"
              style={{
                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                color: '#2563eb',
              }}
              title="Instalar aplicación"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar</span>
            </button>
          )}

          {isIOS && !isInstalled && (
            <span
              className="hidden sm:block px-2 py-1 rounded-full text-[10px] font-bold"
              style={{
                backgroundColor: 'rgba(234, 179, 8, 0.12)',
                color: '#a16207',
              }}
              title="Compartir > Añadir a pantalla de inicio"
            >
              📱 iOS
            </span>
          )}

          <button
            onClick={toggle}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: isDark ? 'oklch(0.3 0 0)' : 'oklch(0.9 0 0)' }}
          >
            {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
          </button>

          <button
            onClick={onLogout}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4 text-red-500" />
          </button>

          <div
            onClick={onOpenProfile}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer border"
            style={{
              backgroundColor: isDark ? 'oklch(0.3 0.1 250)' : 'oklch(0.9 0.1 250)',
              color: isDark ? '#93c5fd' : '#2563eb',
              borderColor: isDark ? '#1e40af' : '#bfdbfe',
            }}
          >
            {iniciales}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div
        className="container mx-auto px-4 max-w-5xl space-y-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
        style={{ marginTop: 'calc(4.6rem + env(safe-area-inset-top, 0px))' }}
      >
        {children}
      </div>
    </>
  )
}
