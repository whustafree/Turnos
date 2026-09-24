import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Trash2, Printer, Bell, BellRing, ChevronUp, ChevronDown } from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import { useCalendar } from './hooks/useCalendar'
import { useSwipe } from './hooks/useSwipe'
import { useUpdateCheck } from './hooks/useUpdateCheck'
import { obtenerDia, obtenerAvisoHoy, generarRecordatorios } from './lib/turnos'
import { isNative, nativeReminderEnabled, scheduleDailyReminder, scheduleSmartReminders } from './lib/native'
import { imprimirCalendario } from './lib/print'
import type { TurnoTipo, TurnosData } from './types'
import { etiquetaCiclo } from './types'
import LoginPage from './components/LoginPage'
import UpdatePasswordPage from './components/UpdatePasswordPage'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import CalendarGrid from './components/CalendarGrid'
import TurnoModal from './components/TurnoModal'
import ProfileModal from './components/ProfileModal'
import VacacionesForm from './components/VacacionesForm'
import AusenciasList from './components/AusenciasList'
import Planificador from './components/Planificador'
import AdminConfigPanel from './components/AdminConfigPanel'
import EquipoTab from './components/EquipoTab'
import WeekStrip from './components/WeekStrip'

type Tab = 'calendario' | 'planificar' | 'ausencias' | 'administrador' | 'equipo'
const TABS: { id: Tab; label: string }[] = [
  { id: 'calendario', label: 'Calendario' },
  { id: 'planificar', label: 'Planificar' },
  { id: 'ausencias', label: 'Ausencias' },
  { id: 'administrador', label: 'Admin' },
  { id: 'equipo', label: 'Equipo' },
]

export default function App() {
  const { user, loading: authLoading, passwordRecovery, completePasswordRecovery, userId, logout } = useAuth()
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
    switchPatron,
    eliminarPatron,
    saveProfile,
    saveCustomCiclo,
    deleteCustomCiclo,
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

  // ─── Actualización automática de la APK ───
  const update = useUpdateCheck()
  const handleDownloadUpdate = () => {
    if (!update.downloadUrl) return
    window.open(update.downloadUrl, '_system')
  }
  const handleCheckUpdate = () => {
    update.refreshVersion()
  }

  // ─── Modo compacto: minimizar la info para dejar el calendario grande ───
  const [minimized, setMinimized] = useState<boolean>(
    () => localStorage.getItem('turnos_minimized') === '1'
  )
  const toggleMinimized = () => {
    setMinimized((prev) => {
      localStorage.setItem('turnos_minimized', prev ? '0' : '1')
      return !prev
    })
  }

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
  const avisoHoy = useMemo(
    () => obtenerAvisoHoy(turnos, perfil.patronActual, perfil.mesesBorrados || []),
    [turnos, perfil.patronActual, perfil.mesesBorrados]
  )
  useEffect(() => {
    if (isNative()) return // en APK usamos notificación nativa (08:00)
    if (typeof Notification === 'undefined') return
    const enabled = localStorage.getItem('turnos_notif') === '1'
    if (!enabled || Notification.permission !== 'granted') return
    if (localStorage.getItem('turnos_notif_date') === notifDateKey) return
    if (avisoHoy.esTurno) {
      try {
        new Notification('TurnosApp', {
          body: avisoHoy.texto,
        })
      } catch { /* ignore */ }
      localStorage.setItem('turnos_notif_date', notifDateKey)
    }
  }, [avisoHoy.texto, avisoHoy.esTurno, notifDateKey])

  // ─── Recordatorios inteligentes nativos (aviso el día anterior 20:00) ───
  useEffect(() => {
    if (!isNative()) return
    if (!nativeReminderEnabled()) return
    const recordatorios = generarRecordatorios(turnos, perfil.patronActual, perfil.mesesBorrados || [])
    const items = recordatorios
      .filter((r) => r.esTurno || r.esFeriado)
      .map((r) => {
        const [y, m, d] = r.fecha.split('-').map(Number)
        const at = new Date(y, m, d - 1, 20, 0, 0) // el día anterior a las 20:00
        return { at, body: r.cuerpo }
      })
      .filter((it) => it.at.getTime() > Date.now())
    // Programa el próximo turno y el feriado más cercano (fechas futuras)
    void scheduleSmartReminders(items.slice(0, 2))
  }, [turnos, perfil.patronActual, perfil.mesesBorrados])

  const handleEnableNotifications = async () => {
    if (isNative()) {
      const ok = await scheduleDailyReminder('Revisa tu turno en TurnosApp')
      if (ok) {
        localStorage.setItem('turnos_notif', '1')
        showError('✅ Recordatorios activados: te avisaré el día anterior a las 20:00.')
      } else {
        showError('Notificaciones no permitidas')
      }
      return
    }
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

  // ─── Gestos: swipe entre pestañas ───
  const swipedAtRef = useRef(0)
  const nextTab = () => {
    const idx = TABS.findIndex((t) => t.id === activeTab)
    setActiveTab(TABS[(idx + 1) % TABS.length].id)
  }
  const prevTab = () => {
    const idx = TABS.findIndex((t) => t.id === activeTab)
    setActiveTab(TABS[(idx - 1 + TABS.length) % TABS.length].id)
  }
  const tabSwipe = useSwipe({ onLeft: nextTab, onRight: prevTab })

  // ─── Gestos: swipe para cambiar de mes ───
  const monthSwipe = useSwipe({
    onLeft: () => {
      swipedAtRef.current = Date.now()
      changeMonth(1)
    },
    onRight: () => {
      swipedAtRef.current = Date.now()
      changeMonth(-1)
    },
  })
  const stopMonthSwipe = (e: React.TouchEvent) => e.stopPropagation()
  const monthSwipeStart = (e: React.TouchEvent) => {
    stopMonthSwipe(e)
    monthSwipe.onTouchStart(e)
  }
  const monthSwipeMove = (e: React.TouchEvent) => {
    stopMonthSwipe(e)
    monthSwipe.onTouchMove(e)
  }
  const monthSwipeEnd = (e: React.TouchEvent) => {
    stopMonthSwipe(e)
    monthSwipe.onTouchEnd(e)
  }

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
    // Ignora el click fantasma que sigue a un swipe de mes
    if (Date.now() - swipedAtRef.current < 400) return
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

  const handleMarcarVacaciones = (y: number, m: number, d: number) => {
    const start = new Date(y, m, d)
    saveVacaciones(start, start, true)
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
      else if (e.key === '5') setActiveTab('equipo')
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

  if (passwordRecovery) {
    return <UpdatePasswordPage onDone={completePasswordRecovery} onError={showError} />
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
        onTabSwipeLeft={nextTab}
        onTabSwipeRight={prevTab}
      >
        {/* Error toast */}
        {errorMsg && (
          <div
            className="fixed right-4 z-50 px-4 py-3 rounded-xl shadow-lg animate-slide-up text-sm font-semibold"
            style={{
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fca5a5',
              top: 'calc(5rem + env(safe-area-inset-top, 0px))',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* ═══ Aviso de actualización disponible ═══ */}
        {update.available && (
          <div
            className="no-print flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-sm animate-slide-up"
            style={{
              backgroundColor: 'rgba(37, 99, 235, 0.10)',
              color: 'var(--color-primary)',
              border: '1px solid rgba(37, 99, 235, 0.35)',
            }}
          >
            <div className="min-w-0">
              <p className="text-sm font-bold">🔄 ¡Nueva versión {update.latest} disponible!</p>
              <p className="text-xs opacity-80">Estás en la versión {update.current}. Toque Descargar para instalar la actualización.</p>
            </div>
            <button
              onClick={handleDownloadUpdate}
              className="shrink-0 px-4 py-2 rounded-xl font-bold text-sm text-white transition"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              Descargar
            </button>
          </div>
        )}

        {/* ═══ DASHBOARD (minimizable) ═══ */}
        {!minimized && (
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
        )}

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
              onClick={toggleMinimized}
              title={minimized ? 'Mostrar mi información' : 'Minimizar información'}
              className="w-10 h-10 flex items-center justify-center rounded-lg transition"
              style={{ color: minimized ? '#2563eb' : 'var(--text-muted)' }}
            >
              {minimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            <button
              onClick={() =>
                imprimirCalendario(
                  {
                    year,
                    month,
                    nombre: perfil.nombre,
                    cargo: perfil.cargo,
                    empresa: perfil.empresa,
                  },
                  turnos,
                  perfil.patronActual,
                  perfil.mesesBorrados || []
                )
              }
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

        {/* ═══ MIS CICLOS (múltiples ciclos activos) ═══ */}
        {!minimized && (perfil.patrones || []).length > 0 && (
          <div className="no-print flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Ciclo activo:
            </span>
            {(perfil.patrones as { fechaInicio: string; cicloId: string }[]).map((p) => {
              const active =
                perfil.patronActual?.fechaInicio === p.fechaInicio &&
                perfil.patronActual?.cicloId === p.cicloId
              const label = etiquetaCiclo(p.cicloId)
              return (
                <div key={`${p.cicloId}-${p.fechaInicio}`} className="flex items-center gap-1">
                  <button
                    onClick={() => switchPatron(p)}
                    className="px-2.5 py-1.5 rounded-full text-[11px] font-bold transition border"
                    style={{
                      borderColor: active ? 'var(--color-primary)' : 'var(--border-color)',
                      backgroundColor: active ? 'rgba(37, 99, 235, 0.12)' : 'var(--bg-card)',
                      color: active ? 'var(--color-primary)' : 'var(--text-muted)',
                    }}
                    title={label}
                  >
                    {label ? label.split(':')[0] : p.cicloId} · {p.fechaInicio}
                  </button>
                  <button
                    onClick={() => eliminarPatron(p)}
                    className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ color: 'var(--text-muted)' }}
                    title="Eliminar ciclo"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* ═══ TURNO DE HOY + RECORDATORIO ═══ */}
        {!minimized && (
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
        )}

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
        <div className="grid grid-cols-5 gap-1.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="py-2.5 rounded-xl font-bold text-[11px] sm:text-sm shadow-sm transition-all"
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
          <div
            className="print-area"
            onTouchStart={monthSwipeStart}
            onTouchMove={monthSwipeMove}
            onTouchEnd={monthSwipeEnd}
          >
            <div className="print-month">{monthLabel}</div>
            <WeekStrip
              turnos={turnos}
              patronActual={perfil.patronActual}
              mesesBorrados={perfil.mesesBorrados || []}
              onSelectDay={(date) => {
                if (date.getMonth() !== month || date.getFullYear() !== year) {
                  setMonth(date.getMonth())
                  setYear(date.getFullYear())
                }
                handleDayClick(date.getDate())
              }}
            />
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
            patrones={perfil.patrones || []}
            onApply={applyCiclo}
            onSwitch={switchPatron}
            onDelete={eliminarPatron}
            onSaveCiclo={saveCustomCiclo}
            onDeleteCiclo={deleteCustomCiclo}
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

        {activeTab === 'equipo' && <EquipoTab />}
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
        onMarcarVacaciones={handleMarcarVacaciones}
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
        updateInfo={{ checking: update.checking, available: update.available, current: update.current, latest: update.latest, downloadUrl: update.downloadUrl }}
        onCheckUpdate={handleCheckUpdate}
      />
    </div>
  )
}
