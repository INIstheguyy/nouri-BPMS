import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { AuthContext } from '../../features/auth/AuthContext'
import type { AuthContextValue } from '../../features/auth/types'
import { AppShell } from './AppShell'

function renderShell(permissions: string[]) {
  const auth: AuthContextValue = {
    session: null,
    user: null,
    access: {
      profileId: 'profile-id',
      email: 'manager@nouri.test',
      fullName: 'Order Manager',
      roles: ['ORDER_MANAGER'],
      permissions,
    },
    status: 'authenticated',
    error: null,
    sessionExpired: false,
    hasPermission: (permission) => permissions.includes(permission),
    refreshAccess: vi.fn(),
    signOut: vi.fn(),
  }

  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('AppShell', () => {
  it('only renders navigation granted by the access snapshot', () => {
    renderShell(['dashboard.operations.read', 'order.read', 'order.create'])

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Orders' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create order' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Staff' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Analytics' })).not.toBeInTheDocument()
  })
})
