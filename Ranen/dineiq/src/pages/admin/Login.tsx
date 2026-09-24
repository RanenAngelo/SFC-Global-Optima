import React, { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, Card, Field, Icon, Input } from '../../components/ui/primitives'
import { DineIQMark } from '../../components/shared'
import { ApiError, useAuth } from '../../lib/api'

const ROLE_BLURBS: Record<string, string> = {
  admin: 'Full access — users, pipeline refresh, all modules.',
  manager: 'Operations + promotions and menu pricing.',
  analyst: 'Analytics modules, read-only operations.',
  viewer: 'Read-only dashboards and reports.',
}

export default function Login() {
  const { user, ready, login } = useAuth()
  const navigate = useNavigate()
  const loc = useLocation() as { state?: { from?: string } }
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (ready && user) return <Navigate to={loc.state?.from ?? '/admin'} replace />

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(username.trim(), password)
      navigate(loc.state?.from ?? '/admin', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed — is the API running?')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <DineIQMark size={36} />
          <div>
            <p className="font-display text-[18px] font-semibold leading-none text-ink">DineIQ Analytics</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">MenuMatrix · Admin</p>
          </div>
        </div>

        <Card className="p-6">
          <h1 className="font-display text-[22px] font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-[13px] text-ink-muted">Use your DineIQ operator account (JWT + role based).</p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <Field label="Username">
              <Input
                icon="User"
                autoComplete="username"
                placeholder="e.g. analyst"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <Input
                  icon="Lock"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-faint transition-colors hover:text-ink"
                >
                  <Icon name={show ? 'EyeOff' : 'Eye'} size={15} />
                </button>
              </div>
            </Field>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-clay-100 bg-clay-50/70 px-3 py-2.5 text-[12.5px] font-medium text-clay-600">
                <Icon name="AlertTriangle" size={14} className="mt-px shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={busy} icon={busy ? 'LoaderCircle' : 'LogIn'}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-5 rounded-xl bg-canvas p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">Seeded roles</p>
            <ul className="mt-2 space-y-1.5">
              {Object.entries(ROLE_BLURBS).map(([role, blurb]) => (
                <li key={role} className="flex gap-2 text-[12px] leading-snug text-ink-muted">
                  <span className="w-14 shrink-0 font-bold capitalize text-ink-soft">{role}</span>
                  {blurb}
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <p className="mt-4 text-center text-[12.5px] text-ink-muted">
          <Link to="/" className="font-semibold text-ember-600 hover:text-ember-700">
            ← Back to customer store
          </Link>
        </p>
      </div>
    </div>
  )
}
