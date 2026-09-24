import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { KeyRound, Loader, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface UpdatePasswordPageProps {
  onDone: () => void
  onError: (msg: string) => void
}

export default function UpdatePasswordPage({ onDone, onError }: UpdatePasswordPageProps) {
  const { updatePassword, completePasswordRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    try {
      await updatePassword(password)
      setDone(true)
      onError('✅ Contraseña actualizada. Ahora inicia sesión.')
    } catch (e: unknown) {
      const err: any = e
      const msg = typeof err?.message === 'string' ? err.message : ''
      if (msg.includes('session') || msg.includes('JWT') || err?.code === 'session_not_found') {
        setError('El enlace es inválido o expiró. Vuelve a solicitar la recuperación.')
      } else {
        setError(msg || 'Error. Intenta de nuevo.')
      }
      onError(error || msg || 'Error. Intenta de nuevo.')
      completePasswordRecovery()
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="w-full max-w-sm text-center">
          <div className="p-6 rounded-xl" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="font-bold text-green-600 mb-2">¡Contraseña actualizada!</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
            <button
              onClick={onDone}
              className="mt-4 font-semibold text-sm"
              style={{ color: 'var(--color-primary)' }}
            >
              Ir a inicio de sesión
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <KeyRound className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
            Nueva contraseña
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            Elige una contraseña nueva para tu cuenta
          </p>
        </div>

        <input
          type="password"
          placeholder="Contraseña nueva (mín. 6 caracteres)"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(null) }}
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
          placeholder="Repite la contraseña"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setError(null) }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="w-full p-4 mb-6 rounded-xl text-lg outline-none"
          style={{
            backgroundColor: 'var(--bg-body)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
          }}
        />

        {error && (
          <div className="w-full flex items-center gap-2 p-3 mb-4 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="text-left">{error}</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader className="w-5 h-5 animate-spin" /> : null}
          {loading ? 'Guardando...' : 'GUARDAR CONTRASEÑA'}
        </button>

        <button
          onClick={onDone}
          className="mt-4 font-semibold text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Volver
        </button>
      </div>
    </div>
  )
}