import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg px-4">
        <div className="card max-w-md w-full text-center space-y-4">
          <h1 className="font-display text-2xl font-bold text-brand-primary">Central Thais</h1>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p className="font-semibold mb-2">Supabase nao configurado</p>
            <p>Para usar o app, crie um projeto gratuito em <strong>supabase.com</strong> e adicione as credenciais no arquivo <code>.env</code>:</p>
            <pre className="mt-2 text-left bg-white/50 rounded-lg p-3 text-xs overflow-x-auto">
{`VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...`}
            </pre>
            <p className="mt-2">Depois, execute o SQL em <code>supabase/schema.sql</code> no SQL Editor do Supabase.</p>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const { error: authError } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password)

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Email ou senha incorretos'
          : authError.message
      )
    } else if (isSignUp) {
      setSuccess('Conta criada! Verifique seu email para confirmar.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg px-4">
      <div className="card max-w-sm w-full space-y-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-brand-primary">Central Thais</h1>
          <p className="text-sm text-brand-text/40 mt-1">Seu painel de organizacao pessoal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-brand-text/50 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-field"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-text/50 mb-1.5">Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field"
              placeholder="Minimo 6 caracteres"
              minLength={6}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-brand-action bg-brand-action/5 rounded-xl px-3 py-2">{error}</p>
          )}
          {success && (
            <p className="text-sm text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2">{success}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Aguarde...' : isSignUp ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-brand-text/40">
          {isSignUp ? 'Ja tem conta?' : 'Ainda nao tem conta?'}{' '}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess('') }}
            className="text-brand-primary font-medium hover:underline"
          >
            {isSignUp ? 'Entrar' : 'Criar conta'}
          </button>
        </p>
      </div>
    </div>
  )
}
