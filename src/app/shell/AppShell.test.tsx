import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthContext } from '../../features/auth/AuthContext'
import type { AuthContextValue } from '../../features/auth/types'
import { AppShell } from './AppShell'

vi.mock('./useNewOrderCount', () => ({ useNewOrderCount: () => 7 }))

function renderShell(permissions: string[], roles = ['ORDER_MANAGER']) {
  const auth: AuthContextValue = {
    session: null,
    user: null,
    access: {
      profileId: 'profile-id',
      email: 'manager@nouri.test',
      fullName: 'Order Manager',
      roles,
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
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the four manager destinations from the access role', () => {
    renderShell(['dashboard.operations.read', 'order.read', 'order.create'])

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Orders' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'New, 7 new orders' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'People' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Staff' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Analytics' })).not.toBeInTheDocument()
  })

  it('renders icon-and-label bottom navigation at compact widths', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    )
    renderShell(['dashboard.operations.read', 'order.read'])

    const mobileNavigation = screen.getByRole('navigation', { name: 'Mobile navigation' })
    expect(mobileNavigation).toHaveTextContent('Home')
    expect(mobileNavigation).toHaveTextContent('New')
    expect(mobileNavigation).toHaveTextContent('Orders')
    expect(mobileNavigation).toHaveTextContent('People')
    expect(screen.queryByRole('navigation', { name: 'Primary navigation' })).not.toBeInTheDocument()
  })

  it('renders all four executive destinations directly at compact widths', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    )
    renderShell(
      ['order.read', 'analytics.read', 'staff.read', 'settings.read'],
      ['EXECUTIVE_ADMIN'],
    )

    const mobileNavigation = screen.getByRole('navigation', { name: 'Mobile navigation' })
    expect(mobileNavigation).toHaveTextContent('Analytics')
    expect(mobileNavigation).toHaveTextContent('Orders')
    expect(mobileNavigation).toHaveTextContent('Staff')
    expect(mobileNavigation).toHaveTextContent('More')
    expect(mobileNavigation.querySelectorAll('a')).toHaveLength(4)
  })
})
