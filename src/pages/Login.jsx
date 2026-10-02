import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isSupabaseConfigured()) {
    return (
      <div className="central-login min-h-screen bg-brand-bg flex items-center justify-center px-4">
        <div className="card max-w-sm w-full text-center">
          <h1 className="font-display text-2xl font-bold text-brand-primary mb-2">Central Thais</h1>
          <p className="text-sm text-brand-text/40 mb-6">Configure o Supabase para comecar</p>
          <div className="text-left bg-brand-text/[0.03] rounded-xl p-4 text-xs text-brand-text/50 space-y-2">
            <p>1. Crie um projeto em <strong>supabase.com</strong></p>
            <p>2. Copie a URL e a anon key</p>
            <p>3. Crie o arquivo <code className="bg-brand-text/[0.06] px-1.5 py-0.5 rounded">.env</code> com:</p>
            <pre className="bg-brand-text/[0.06] p-3 rounded-lg overflow-x-auto text-[11px]">
{`VITE_SUPABASE_URL=sua-url
VITE_SUPABASE_ANON_KEY=sua-chave`}
            </pre>
            <p>4. Execute o schema.sql no SQL Editor</p>
            <p>5. Reinicie o dev server</p>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: authError } = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password)

      if (authError) {
        if (authError.message.includes('Invalid login')) {
          setError('Email ou senha incorretos')
        } else if (authError.message.includes('already registered')) {
          setError('Este email ja esta cadastrado')
        } else {
          setError(authError.message)
        }
      }
    } catch {
      setError('Erro ao conectar. Tente novamente.')
    }
    setLoading(false)
  }

  return (
    <div className="central-login min-h-screen bg-brand-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-brand-primary">Central Thais</h1>
          <p className="text-sm text-brand-text/35 mt-1.5">Seu espaço de organização pessoal</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <div className="bg-brand-action/8 text-brand-action text-sm px-4 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="login-email" className="block text-xs font-medium text-brand-text/50 mb-1.5">E-mail</label>
            <input
              id="login-email" type="email" autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="input-field"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-medium text-brand-text/50 mb-1.5">Senha</label>
            <input
              id="login-password" type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimo 6 caracteres"
              className="input-field"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Carregando...' : isSignUp ? 'Criar conta' : 'Entrar'}
          </button>

          <p className="text-center text-sm text-brand-text/40">
            {isSignUp ? 'Ja tem conta? ' : 'Ainda nao tem conta? '}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError('') }}
              className="text-brand-primary font-semibold hover:text-brand-accent transition-colors"
            >
              {isSignUp ? 'Entrar' : 'Criar conta'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}

