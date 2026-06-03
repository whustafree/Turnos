import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Box } from 'lucide-react'

interface LoginPageProps {
  onError: (msg: string) => void
}

export default function LoginPage({ onError }: LoginPageProps) {
  const { login, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) return
    setLoading(true)
    try {
      await login(email, password)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al iniciar sesión'
      onError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    if (!email || !password) return
    setLoading(true)
    try {
      await signUp(email, password)
      alert('Cuenta creada. Revisa tu correo para verificar.')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear cuenta'
      onError(msg)
    } finally {
      setLoading(false)
    }
  }

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
          onChange={(e) => setEmail(e.target.value)}
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
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          className="w-full p-4 mb-6 rounded-xl text-lg outline-none"
          style={{
            backgroundColor: 'var(--bg-body)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
          }}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? 'Cargando...' : 'INICIAR SESIÓN'}
        </button>

        <button
          onClick={handleSignUp}
          className="mt-4 font-semibold text-sm"
          style={{ color: 'var(--color-primary)' }}
        >
          Crear cuenta nueva
        </button>
      </div>
    </div>
  )
}
