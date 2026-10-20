import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'

import { AuthContext } from '../features/auth/AuthContext'
import type { AuthContextValue } from '../features/auth/types'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

export function createTestAuth(permissions: string[] = []): AuthContextValue {
  return {
    session: null,
    user: null,
    access: {
      profileId: 'test-profile-id',
      email: 'staff@nouri.test',
      fullName: 'Test Staff',
      roles: ['ORDER_MANAGER'],
      permissions,
    },
    status: 'authenticated',
    error: null,
    sessionExpired: false,
    hasPermission: (permission) => permissions.includes(permission),
    refreshAccess: async () => {},
    signOut: async () => {},
  }
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string
  auth?: AuthContextValue
  queryClient?: QueryClient
}

export function renderWithProviders(
  ui: ReactElement,
  {
    route = '/',
    auth,
    queryClient = createTestQueryClient(),
    ...options
  }: RenderWithProvidersOptions = {},
) {
  function Providers({ children }: { children: ReactNode }) {
    const content = <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    return (
      <MemoryRouter initialEntries={[route]}>
        {auth ? <AuthContext.Provider value={auth}>{content}</AuthContext.Provider> : content}
      </MemoryRouter>
    )
  }

  return { queryClient, ...render(ui, { wrapper: Providers, ...options }) }
}
