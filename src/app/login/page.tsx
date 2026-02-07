'use client'

import { useActionState } from 'react'
import { loginAction } from './actions'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const initialState = {
  error: '',
}

export default function LoginPage() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

  useEffect(() => {
    if (state?.success) {
      router.push('/dashboard')
    }
  }, [state, router])

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '1rem',
    }}>
      <div className="glass-card animate-fade-in" style={{
        width: '100%',
        maxWidth: '420px',
        borderRadius: '16px',
        padding: '2.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #ee4d2d 0%, #cb2d3e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Shopee Manager
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>Prisma Local DB (Super Fast) ⚡</p>
        </div>

        {(state?.error) && (
          <div className="animate-fade-in" style={{
            background: 'rgba(254, 226, 226, 0.5)',
            border: '1px solid #fca5a5',
            color: '#b91c1c',
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
          }}>
            {state.error}
          </div>
        )}

        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Email</label>
            <input
              name="email"
              type="text"
              required
              placeholder="admin@shopee.com"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.5)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Password</label>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.5)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            style={{
              marginTop: '0.5rem',
              padding: '0.875rem',
              background: 'linear-gradient(to right, #ee4d2d, #ff7337)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
