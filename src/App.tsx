import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Trash2, Printer, Bell, BellRing } from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import { useCalendar } from './hooks/useCalendar'
import { obtenerDia } from './lib/turnos'
import type { TurnoTipo, TurnosData } from './types'
import LoginPage from './components/LoginPage'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import CalendarGrid from './components/CalendarGrid'
import TurnoModal from './components/TurnoModal'
import ProfileModal from './components/ProfileModal'
import VacacionesForm from './components/VacacionesForm'
import AusenciasList from './components/AusenciasList'
import Planificador from './components/Planificador'
import AdminConfigPanel from './components/AdminConfigPanel'

type Tab = 'calendario' | 'planificar' | 'ausencias' | 'administrador'

export default function App() {
  const { user, loading: authLoading, userId, logout } = useAuth()
  const {
    turnos,
    perfil,
    activeTab,
    setActiveTab,
    selectedDay,
    showTurnoModal,
    setShowTurnoModal,
    showProfileModal,
    setShowProfileModal,
    addTurno,
    marcarAdmin,
    removeTurno,
    clearMonth,
    clearAll,
    saveVacaciones,
    eliminarPeriodo,
    applyCiclo,
    saveProfile,
    openDay,
    getDashboardStats,
    getAusencias,
    importData,
    isOnline,
    syncError,
  } = useCalendar(userId)

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Month/Year labels ───
  const monthLabel = useMemo(
    () =>
      new Date(year, month).toLocaleString('es-ES', {
        month: 'long',
        year: 'numeric',
      }),
    [year, month]
  )

  // ─── Month select options ───
  const monthNames = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ]

  // ─── Stats ───
  const stats = getDashboardStats(year)
  const ausenciaGroups = getAusencias(year)

  // ─── Turno de HOY ───
  const hoyInfo = useMemo(() => {
    const t = today
    const data = obtenerDia(turnos, t.getFullYear(), t.getMonth(), t.getDate(), perfil.patronActual, perfil.mesesBorrados || [])
    if (!data) return { label: 'Hoy: Descanso', color: '#6b7280', isWork: false }
    if (data.tipo === 'vacaciones') return { label: 'Hoy: Vacaciones', color: '#ca8a04', isWork: false }
    if (data.tipo === 'administrativo') return { label: 'Hoy: Día administrativo', color: '#2563eb', isWork: false }
    const turnosDia = data.turnos || []
    if (turnosDia.includes('noche')) return { label: 'Hoy: NOCHE', color: '#4338ca', isWork: true }
    if (turnosDia.includes('dia')) return { label: 'Hoy: DÍA', color: '#059669', isWork: true }
    return { label: 'Hoy: Descanso', color: '#6b7280', isWork: false }
  }, [turnos, perfil.patronActual, perfil.mesesBorrados])

  // ─── Recordatorio del turno de HOY (notificación del navegador) ───
  const notifDateKey = today.toDateString()
  useEffect(() => {
    if (typeof Notification === 'undefined') return
    const enabled = localStorage.getItem('turnos_notif') === '1'
    if (!enabled || Notification.permission !== 'granted') return
    if (localStorage.getItem('turnos_notif_date') === notifDateKey) return
    if (hoyInfo.isWork) {
      try {
        new Notification('TurnosApp', {
          body: `${hoyInfo.label} — buen turno! 💪`,
        })
      } catch { /* ignore */ }
      localStorage.setItem('turnos_notif_date', notifDateKey)
    }
  }, [hoyInfo.label, hoyInfo.isWork, notifDateKey])

  const handleEnableNotifications = async () => {
    if (typeof Notification === 'undefined') {
      showError('Tu navegador no soporta notificaciones')
      return
    }
    try {
      const perm = await Notification.requestPermission()
      if (perm === 'granted') {
        localStorage.setItem('turnos_notif', '1')
        showError('✅ Recordatorios activados. Verás el turno del día al abrir la app.')
      } else {
        showError('Notificaciones no permitidas')
      }
    } catch {
      showError('No se pudieron activar las notificaciones')
    }
  }

  // ─── Tema de acento (color de la app) ───
  const [accent, setAccent] = useState<string>(() => localStorage.getItem('turnos_accent') || '#2563eb')
  const applyAccent = useCallback((hex: string) => {
    setAccent(hex)
    localStorage.setItem('turnos_accent', hex)
    document.documentElement.style.setProperty('--color-primary', hex)
    document.documentElement.style.setProperty('--color-primary-dark', hex)
  }, [])
  useEffect(() => {
    applyAccent(localStorage.getItem('turnos_accent') || '#2563eb')
  }, [applyAccent])

  // ─── Handler: EXTRA rápido (tocar y mantener) ───
  const handleQuickExtra = (day: number) => {
    const data = obtenerDia(turnos, year, month, day, perfil.patronActual, perfil.mesesBorrados || [])
    const esNoche = data?.turnos?.includes('noche') || false
    addTurno(year, month, day, esNoche ? 'extra-noche' : 'extra-dia')
  }

  // ─── Admin config save handler ───
  const handleAdminSave = (data: {
    adminTotal: number
    vacacionesLey: number
    vacacionesSindicato: number
    vacacionesTotal: number
  }) => {
    saveProfile(data)
  }

  // ─── Handlers ───
  const changeMonth = (delta: number) => {
    let newMonth = month + delta
    let newYear = year
    if (newMonth < 0) {
      newMonth = 11
      newYear--
    } else if (newMonth > 11) {
      newMonth = 0
      newYear++
    }
    setMonth(newMonth)
    setYear(newYear)
  }

  const goToToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
  }

  const handleOpenProfile = () => setShowProfileModal(true)
  const handleCloseProfile = () => setShowProfileModal(false)

  const handleLogout = async () => {
    await logout()
    window.location.reload()
  }

  const handleDayClick = (day: number) => {
    openDay(day)
  }

  const handleAddTurno = (y: number, m: number, d: number, tipo: TurnoTipo) => {
    addTurno(y, m, d, tipo)
    setShowTurnoModal(false)
  }

  const handleMarcarAdmin = (y: number, m: number, d: number) => {
    if (stats.adminUsados >= perfil.adminTotal) {
      if (!confirm('Límite alcanzado. ¿Continuar?')) return
    }
    marcarAdmin(y, m, d)
    setShowTurnoModal(false)
  }

  const handleRemoveTurno = (y: number, m: number, d: number) => {
    removeTurno(y, m, d)
    setShowTurnoModal(false)
  }

  const handleClearMonth = () => {
    if (!confirm(`¿Borrar todos los turnos de ${monthLabel}?`)) return
    clearMonth(year, month)
  }

  const handleClearAll = () => {
    if (!confirm('¿Borrar TODOS los turnos de la aplicación? Esta acción no se puede deshacer.')) return
    clearAll()
  }

  const handleDeletePeriod = (inicioStr: string, finStr: string) => {
    if (!confirm('¿Eliminar y restaurar turnos?')) return
    eliminarPeriodo(inicioStr, finStr)
  }

  // ─── Import handler ───
  const handleImport = useCallback(
    (newTurnos: TurnosData, newPerfil: typeof perfil) => {
      importData(newTurnos, newPerfil)
    },
    [importData]
  )

  const showError = (msg: string) => {
    setErrorMsg(msg)
    if (errorTimer.current) clearTimeout(errorTimer.current)
    errorTimer.current = setTimeout(() => setErrorMsg(null), 4000)
  }

  // ─── Keyboard Shortcuts ───
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'ArrowLeft') changeMonth(-1)
      else if (e.key === 'ArrowRight') changeMonth(1)
      else if (e.key === 't' || e.key === 'T') goToToday()
      else if (e.key === '1') setActiveTab('calendario')
      else if (e.key === '2') setActiveTab('planificar')
      else if (e.key === '3') setActiveTab('ausencias')
      else if (e.key === '4') setActiveTab('administrador')
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [month, year])

  // ─── Auth Gate ───
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-card)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Cargando...</p>
      </div>
    )
  }

  if (!user) {
    return <LoginPage onError={showError} />
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-body)', minHeight: '100dvh' }}>
      <Layout
        userName={perfil.nombre}
        isOnline={isOnline}
        onOpenProfile={handleOpenProfile}
        onLogout={handleLogout}
      >
        {/* Error toast */}
        {errorMsg && (
          <div
            className="fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg animate-slide-up text-sm font-semibold"
            style={{
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fca5a5',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* ═══ DASHBOARD ═══ */}
        <Dashboard
          stats={stats}
          userName={perfil.nombre}
          userCargo={perfil.cargo}
          userEmpresa={perfil.empresa}
          onOpenProfile={handleOpenProfile}
          onGoCalendar={() => {
            setActiveTab('calendario')
            goToToday()
          }}
          turnos={turnos}
          profile={perfil}
          onImport={handleImport}
        />

        {/* ═══ MONTH NAVIGATOR ═══ */}
        <div
          className="card p-2 flex justify-between items-center shadow-sm rounded-xl border flex-wrap gap-2"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-center">
            <button
              onClick={() => changeMonth(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-lg transition"
              style={{ color: 'var(--text-muted)' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center cursor-pointer px-2" onClick={goToToday}>
              <h3 className="text-lg font-bold uppercase" style={{ color: 'var(--text-main)' }}>
                {monthLabel}
              </h3>
              <div className="text-[10px] text-blue-500 font-bold tracking-widest">HOY</div>
            </div>

            <button
              onClick={() => changeMonth(1)}
              className="w-10 h-10 flex items-center justify-center rounded-lg transition"
              style={{ color: 'var(--text-muted)' }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-1 pr-2">
            <button
              onClick={() => window.print()}
              title="Imprimir / guardar PDF del mes"
              className="w-10 h-10 flex items-center justify-center rounded-lg transition"
              style={{ color: 'var(--text-muted)' }}
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleClearMonth}
              title="Borrar mes completo"
              className="w-10 h-10 flex items-center justify-center rounded-lg transition"
              style={{ color: '#ef4444' }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="bg-transparent text-sm font-bold outline-none cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              {monthNames.map((m, i) => (
                <option key={i} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-transparent text-sm font-bold outline-none cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              {Array.from({ length: 7 }, (_, i) => 2024 + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ═══ TURNO DE HOY + RECORDATORIO ═══ */}
        <div className="no-print flex items-center justify-between gap-2 p-3 rounded-xl border shadow-sm"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: hoyInfo.isWork ? hoyInfo.color : 'var(--border-color)',
          }}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: hoyInfo.color }} />
            <span className="font-bold text-sm uppercase tracking-wide" style={{ color: hoyInfo.color }}>
              {hoyInfo.label}
            </span>
          </div>
          <button
            onClick={handleEnableNotifications}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold transition"
            style={{
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              color: '#2563eb',
            }}
            title="Activar recordatorio del turno del día"
          >
            {localStorage.getItem('turnos_notif') === '1' ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
            Recordar
          </button>
        </div>

        {/* ═══ ERROR DE SINCRONIZACIÓN ═══ */}
        {syncError && (
          <div className="no-print p-3 rounded-xl border text-sm font-semibold animate-slide-up"
            style={{
              backgroundColor: 'rgba(234, 179, 8, 0.1)',
              color: '#a16207',
              borderColor: 'rgba(234, 179, 8, 0.3)',
            }}>
            ⚠️ {syncError}
          </div>
        )}

        {/* ═══ TABS ═══ */}
        <div className="grid grid-cols-4 gap-2">
          {([
            { id: 'calendario' as Tab, label: 'Calendario' },
            { id: 'planificar' as Tab, label: 'Planificar' },
            { id: 'ausencias' as Tab, label: 'Ausencias' },
            { id: 'administrador' as Tab, label: 'Admin' },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="py-3 rounded-xl font-bold text-sm shadow-sm transition-all"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: `1px solid ${activeTab === tab.id ? 'var(--color-primary)' : 'var(--border-color)'}`,
                color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--text-muted)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ TAB CONTENT ═══ */}
        {activeTab === 'calendario' && (
          <div className="print-area">
            <CalendarGrid
              year={year}
              month={month}
              turnos={turnos}
              patronActual={perfil.patronActual}
              mesesBorrados={perfil.mesesBorrados || []}
              onOpenDay={handleDayClick}
              onQuickExtra={handleQuickExtra}
            />
          </div>
        )}

        {activeTab === 'planificar' && (
          <Planificador
            year={year}
            month={month}
            activePattern={perfil.patronActual}
            onApply={applyCiclo}
            onNavigate={(y, m) => {
              setYear(y)
              setMonth(m)
            }}
          />
        )}

        {activeTab === 'administrador' && (
          <div className="space-y-4">
            <AdminConfigPanel
              adminTotal={perfil.adminTotal}
              vacacionesLey={perfil.vacacionesLey}
              vacacionesSindicato={perfil.vacacionesSindicato}
              vacacionesTotal={perfil.vacacionesTotal}
              adminUsados={stats.adminUsados}
              vacacionesUsadas={stats.vacacionesUsadas}
              onSave={handleAdminSave}
            />

            {/* ═══ TEMA DE COLOR ═══ */}
            <div className="no-print p-5 rounded-xl shadow-sm border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <h3 className="font-bold text-lg mb-3" style={{ color: 'var(--text-main)' }}>
                Tema de color
              </h3>
              <div className="flex flex-wrap gap-3">
                {[
                  { name: 'Azul', hex: '#2563eb' },
                  { name: 'Verde', hex: '#059669' },
                  { name: 'Violeta', hex: '#7c3aed' },
                  { name: 'Rojo', hex: '#dc2626' },
                  { name: 'Ámbar', hex: '#d97706' },
                ].map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => applyAccent(c.hex)}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={`w-9 h-9 rounded-full transition-transform ${accent === c.hex ? 'ring-2 ring-offset-2 scale-110' : ''}`}
                      style={{ backgroundColor: c.hex, boxShadow: `0 0 12px ${c.hex}66` }}
                    />
                    <span className="text-[10px] font-semibold" style={{ color: accent === c.hex ? c.hex : 'var(--text-muted)' }}>
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleClearAll}
              className="w-full py-4 rounded-xl font-bold transition flex items-center justify-center gap-2"
              style={{
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
              }}
            >
              <Trash2 className="w-4 h-4" /> BORRAR TODOS LOS TURNOS
            </button>
          </div>
        )}

        {activeTab === 'ausencias' && (
          <div className="space-y-6 animate-slide-up">
            <VacacionesForm
              onSave={saveVacaciones}
              userName={perfil.nombre}
            />

            <div
              className="p-6 rounded-xl shadow-sm border"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
              }}
            >
              <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-main)' }}>
                Historial de Ausencias
              </h3>
              <AusenciasList
                groups={ausenciaGroups}
                onDelete={handleDeletePeriod}
              />
            </div>
          </div>
        )}
      </Layout>

      {/* ═══ TURNO MODAL ═══ */}
      <TurnoModal
        isOpen={showTurnoModal}
        day={selectedDay}
        year={year}
        month={month}
        turnos={turnos}
        onAddTurno={handleAddTurno}
        onMarcarAdmin={handleMarcarAdmin}
        onRemove={handleRemoveTurno}
        onClose={() => setShowTurnoModal(false)}
      />

      {/* ═══ PROFILE MODAL ═══ */}
      <ProfileModal
        isOpen={showProfileModal}
        profile={perfil}
        onSave={saveProfile}
        onLogout={handleLogout}
        onClose={handleCloseProfile}
      />
    </div>
  )
}
