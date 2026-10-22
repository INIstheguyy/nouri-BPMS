import type { PropsWithChildren } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from './useAuth'

function LoadingScreen() {
  return (
    <main className="auth-status" aria-live="polite">
      <span className="status-dot" /> Verifying your session…
    </main>
  )
}

export function ProtectedRoute() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'loading') return <LoadingScreen />

  if (auth.status === 'unauthenticated') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname, sessionExpired: auth.sessionExpired }}
      />
    )
  }

  if (auth.status === 'inactive') {
    return (
      <main className="auth-status auth-blocked">
        <p className="eyebrow">Access unavailable</p>
        <h1>Your staff account is inactive.</h1>
        <p>Contact an Executive Admin if you believe this is a mistake.</p>
        <button className="secondary-action" type="button" onClick={() => void auth.signOut()}>
          Sign out
        </button>
      </main>
    )
  }

  if (auth.status === 'error') {
    return (
      <main className="auth-status auth-blocked">
        <p className="eyebrow">Access check failed</p>
        <h1>We could not verify your access.</h1>
        <p>{auth.error}</p>
        <button
          className="secondary-action"
          type="button"
          onClick={() => void auth.refreshAccess()}
        >
          Try again
        </button>
      </main>
    )
  }

  return <Outlet />
}

export function PublicOnlyRoute() {
  const auth = useAuth()

  if (auth.status === 'loading') return <LoadingScreen />
  if (auth.status === 'authenticated') return <Navigate to="/" replace />

  return <Outlet />
}

export function RoleRedirect() {
  const auth = useAuth()
  const isExecutive = auth.access?.roles.includes('EXECUTIVE_ADMIN') ?? false

  return <Navigate to={isExecutive ? '/analytics' : '/home'} replace />
}

export function RoleRoute({
  role,
  children,
}: PropsWithChildren<{ role: 'EXECUTIVE_ADMIN' | 'ORDER_MANAGER' }>) {
  const auth = useAuth()

  if (!auth.access?.roles.includes(role)) return <Navigate to="/" replace />

  return children
}

export function PermissionRoute({
  permission,
  children,
}: PropsWithChildren<{ permission: string }>) {
  const auth = useAuth()

  if (!auth.hasPermission(permission)) return <Navigate to="/" replace />

  return children
}
