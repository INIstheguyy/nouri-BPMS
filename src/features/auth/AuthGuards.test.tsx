import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { AuthContext } from './AuthContext'
import { PublicOnlyRoute, RoleRedirect, RoleRoute } from './AuthGuards'
import type { AuthContextValue } from './types'

function authValue(roles: string[]): AuthContextValue {
  return {
    session: null,
    user: null,
    access: {
      profileId: 'profile-id',
      email: 'staff@nouri.test',
      fullName: 'Nouri Staff',
      roles,
      permissions: [],
    },
    status: 'authenticated',
    error: null,
    sessionExpired: false,
    hasPermission: () => false,
    refreshAccess: vi.fn(),
    signOut: vi.fn(),
  }
}

function renderWithAuth(routes: ReactNode, roles: string[], initialEntry = '/') {
  return render(
    <AuthContext.Provider value={authValue(roles)}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>{routes}</Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('role-aware routing', () => {
  it.each([
    ['ORDER_MANAGER', 'Manager home'],
    ['EXECUTIVE_ADMIN', 'Executive analytics'],
  ])('redirects %s to its landing screen', (role, destination) => {
    renderWithAuth(
      <>
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/home" element={<p>Manager home</p>} />
        <Route path="/analytics" element={<p>Executive analytics</p>} />
      </>,
      [role],
    )

    expect(screen.getByText(destination)).toBeInTheDocument()
  })

  it('bounces a manager away from an executive route', () => {
    renderWithAuth(
      <>
        <Route path="/" element={<p>Role landing</p>} />
        <Route
          path="/analytics"
          element={
            <RoleRoute role="EXECUTIVE_ADMIN">
              <p>Executive analytics</p>
            </RoleRoute>
          }
        />
      </>,
      ['ORDER_MANAGER'],
      '/analytics',
    )

    expect(screen.getByText('Role landing')).toBeInTheDocument()
    expect(screen.queryByText('Executive analytics')).not.toBeInTheDocument()
  })

  it('returns authenticated users from public-only pages to role routing', () => {
    renderWithAuth(
      <>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<p>Login</p>} />
        </Route>
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/analytics" element={<p>Executive analytics</p>} />
      </>,
      ['EXECUTIVE_ADMIN'],
      '/login',
    )

    expect(screen.getByText('Executive analytics')).toBeInTheDocument()
  })
})
