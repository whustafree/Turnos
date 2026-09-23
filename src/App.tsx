import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import { useCalendar } from './hooks/useCalendar'
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
    saveVacaciones,
    eliminarPeriodo,
    applyCiclo,
    saveProfile,
    openDay,
    getDashboardStats,
    getAusencias,
    importData,
    isOnline,
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
          <CalendarGrid
            year={year}
            month={month}
            turnos={turnos}
            patronActual={perfil.patronActual}
            onOpenDay={handleDayClick}
          />
        )}

        {activeTab === 'planificar' && (
          <Planificador
            year={year}
            month={month}
            onApply={applyCiclo}
          />
        )}

        {activeTab === 'administrador' && (
          <AdminConfigPanel
            adminTotal={perfil.adminTotal}
            vacacionesLey={perfil.vacacionesLey}
            vacacionesSindicato={perfil.vacacionesSindicato}
            vacacionesTotal={perfil.vacacionesTotal}
            adminUsados={stats.adminUsados}
            vacacionesUsadas={stats.vacacionesUsadas}
            onSave={handleAdminSave}
          />
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
