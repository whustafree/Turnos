import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Box, Mail, Key, Loader, AlertTriangle } from 'lucide-react'

interface LoginPageProps {
  onError: (msg: string) => void
}

function mensajeError(e: unknown): string {
  const err: any = e
  const code = err?.code as string | undefined
  const message = typeof err?.message === 'string' ? err.message : ''
  const msg = message.toLowerCase()
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials') || msg.includes('invalid email or password') || msg.includes('user not found') || msg.includes('wrong password')) {
    return 'Correo o contraseña incorrectos. Verifica e intenta de nuevo.'
  }
  if (msg.includes('email not confirmed') || code === 'email_not_confirmed') {
    return 'Correo no confirmado. Revisa tu bandeja de entrada para confirmarlo.'
  }
  if (msg.includes('user already registered') || code === 'user_already_exists') {
    return 'Ese correo ya tiene una cuenta. Inicia sesión o restablece tu contraseña.'
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Demasiados intentos. Espera unos minutos antes de volver a intentar.'
  }
  return message || 'Error. Intenta de nuevo.'
}

function ErrorBox({ msg }: { msg: string | null }) {
  if (!msg) return null
  return (
    <div className="w-full flex items-center gap-2 p-3 mb-4 rounded-xl text-sm font-semibold"
      style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span className="text-left">{msg}</span>
    </div>
  )
}

export default function LoginPage({ onError }: LoginPageProps) {
  const { login, signUp, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [resetSent, setResetSent] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const handleLogin = async () => {
    setLoginError(null)
    if (!email || !password) return
    setLoading(true)
    try {
      await login(email, password)
    } catch (e: unknown) {
      const msg = mensajeError(e)
      setLoginError(msg)
      onError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    setLoginError(null)
    if (!email || !password) return
    if (password.length < 6) {
      setLoginError('La contraseña debe tener al menos 6 caracteres')
      onError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    try {
      await signUp(email, password)
      alert('✅ Cuenta creada. Revisa tu correo para verificar.')
      setMode('login')
    } catch (e: unknown) {
      const msg = mensajeError(e)
      setLoginError(msg)
      onError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    setLoginError(null)
    if (!email) {
      setLoginError('Ingresa tu correo primero')
      onError('Ingresa tu correo primero')
      return
    }
    setLoading(true)
    try {
      await resetPassword(email)
      setResetSent(true)
      setLoginError(null)
      onError('✅ Revisa tu correo. Te enviamos el enlace para restablecer.')
    } catch (e: unknown) {
      const msg = mensajeError(e)
      setLoginError(msg)
      onError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ─── Modo: Restablecer contraseña ───
  if (mode === 'reset') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="w-full max-w-sm text-center">
          <div className="mb-8">
            <Key className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
              Restablecer
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              Te enviaremos un enlace para cambiar tu contraseña
            </p>
          </div>

          {resetSent ? (
            <div
              className="p-6 rounded-xl"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
            >
              <Mail className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <p className="font-bold text-green-600 mb-2">¡Correo enviado!</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Revisa tu bandeja de entrada y sigue las instrucciones.
                Si no lo ves, revisa la carpeta de spam.
              </p>
              <button
                onClick={() => { setMode('login'); setResetSent(false) }}
                className="mt-4 font-semibold text-sm"
                style={{ color: 'var(--color-primary)' }}
              >
                Volver a inicio de sesión
              </button>
            </div>
          ) : (
            <>
              <input
                type="email"
                placeholder="Tu correo electrónico"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setLoginError(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                className="w-full p-4 mb-6 rounded-xl text-lg outline-none"
                style={{
                  backgroundColor: 'var(--bg-body)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                }}
                autoFocus
              />

              <ErrorBox msg={loginError} />

              <button
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader className="w-5 h-5 animate-spin" /> : null}
                {loading ? 'Enviando...' : 'ENVIAR ENLACE'}
              </button>

              <button
                onClick={() => setMode('login')}
                className="mt-4 font-semibold text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                ← Volver
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ─── Modo: Crear cuenta ───
  if (mode === 'signup') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="w-full max-w-sm text-center">
          <div className="mb-8">
            <Box className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
              Crear Cuenta
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              Regístrate para gestionar tus turnos
            </p>
          </div>

          <input
            type="email"
            placeholder="Correo"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setLoginError(null) }}
            className="w-full p-4 mb-3 rounded-xl text-lg outline-none"
            style={{
              backgroundColor: 'var(--bg-body)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
            }}
            autoFocus
          />
          <input
            type="password"
            placeholder="Contraseña (mín. 6 caracteres)"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setLoginError(null) }}
            onKeyDown={(e) => e.key === 'Enter' && handleSignUp()}
            className="w-full p-4 mb-6 rounded-xl text-lg outline-none"
            style={{
              backgroundColor: 'var(--bg-body)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
            }}
          />

          <ErrorBox msg={loginError} />

          <button
            onClick={handleSignUp}
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'CREAR CUENTA'}
          </button>

          <button
            onClick={() => setMode('login')}
            className="mt-4 font-semibold text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            ← Ya tengo cuenta
          </button>
        </div>
      </div>
    )
  }

  // ─── Modo: Inicio de sesión ───
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <Box className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
            Portal Turnos
          </h1>
          <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
            Sincronización en la nube
          </p>
        </div>

        <input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setLoginError(null) }}
          className="w-full p-4 mb-3 rounded-xl text-lg outline-none"
          style={{
            backgroundColor: 'var(--bg-body)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
          }}
          autoFocus
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setLoginError(null) }}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          className="w-full p-4 mb-4 rounded-xl text-lg outline-none"
          style={{
            backgroundColor: 'var(--bg-body)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
          }}
        />

        <ErrorBox msg={loginError} />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? 'Cargando...' : 'INICIAR SESIÓN'}
        </button>

        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => setMode('reset')}
            className="text-xs font-semibold"
            style={{ color: 'var(--text-muted)' }}
          >
            ¿Olvidaste tu contraseña?
          </button>

          <button
            onClick={() => setMode('signup')}
            className="font-semibold text-sm"
            style={{ color: 'var(--color-primary)' }}
          >
            Crear cuenta nueva
          </button>
        </div>
      </div>
    </div>
  )
}
