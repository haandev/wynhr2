import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { session, wyndbase } from '../wyndbase'

/** Sign-in leg: start the OAuth flow, or finish it on the way back. Never retries a failed exchange in a loop. */
export function Login() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'working' | 'failed' | 'idle'>('working')
  const [error, setError] = useState<string | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    ;(async () => {
      const target = new URLSearchParams(location.search).get('redirect') || '/'
      const safe = (t: string | null | undefined) => (t && t.startsWith('/') && !t.startsWith('//') ? t : '/')
      const cb = await session.handleCallback()
      if (cb.status === 'granted') return navigate(safe(cb.redirect || target), { replace: true })
      if (cb.status === 'failed' || cb.status === 'error') {
        setError(('errorDescription' in cb && cb.errorDescription) || ('error' in cb && String(cb.error)) || 'Sign-in failed')
        return setPhase('failed')
      }
      if (wyndbase.auth.isAuthenticated()) return navigate(safe(target), { replace: true })
      setPhase('idle')
    })()
  }, [navigate])

  return (
    <div className="login">
      <div className="login-card">
        <div className="brand big">
          <span className="logo">W</span> WynHR
        </div>
        <p className="muted">People, time off and org structure in one place.</p>
        {phase === 'working' && <p className="muted">Signing you in…</p>}
        {phase !== 'working' && (
          <button className="btn primary wide" onClick={() => session.authorize({ redirect: true })}>
            Sign in with Wyndbase
          </button>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  )
}
