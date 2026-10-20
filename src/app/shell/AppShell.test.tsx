import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('only renders navigation granted by the access snapshot', () => {
    renderShell(['dashboard.operations.read', 'order.read', 'order.create'])

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Orders' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create order' })).toBeInTheDocument()
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
    expect(mobileNavigation).toHaveTextContent('Dashboard')
    expect(mobileNavigation).toHaveTextContent('Orders')
    expect(screen.queryByRole('navigation', { name: 'Primary navigation' })).not.toBeInTheDocument()
  })

  it('moves secondary admin destinations into the compact More menu', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    )
    renderShell([
      'dashboard.operations.read',
      'order.read',
      'customer.read',
      'analytics.read',
      'staff.read',
      'settings.read',
    ])

    const mobileNavigation = screen.getByRole('navigation', { name: 'Mobile navigation' })
    expect(mobileNavigation).toHaveTextContent('Dashboard')
    expect(mobileNavigation).toHaveTextContent('Orders')
    expect(mobileNavigation).toHaveTextContent('Customers')
    expect(mobileNavigation).toHaveTextContent('More')
    expect(screen.queryByRole('navigation', { name: 'More navigation' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'More navigation' }))

    const moreNavigation = screen.getByRole('navigation', { name: 'More navigation' })
    expect(moreNavigation).toHaveTextContent('Analytics')
    expect(moreNavigation).toHaveTextContent('Staff')
    expect(moreNavigation).toHaveTextContent('Settings')
  })
})
