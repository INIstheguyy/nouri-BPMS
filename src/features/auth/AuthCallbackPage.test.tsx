import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { createTestAuth, renderWithProviders } from '../../test/render'
import { AuthCallbackPage } from './AuthCallbackPage'

describe('AuthCallbackPage', () => {
  it('renders the invite password screen for an invitation hash', () => {
    const auth = createTestAuth()
    auth.session = {} as NonNullable<typeof auth.session>

    renderWithProviders(
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
      </Routes>,
      { auth, route: '/auth/callback#access_token=secret&type=invite' },
    )

    expect(
      screen.getByRole('heading', { name: 'Welcome to Nouri. Set your password.' }),
    ).toBeInTheDocument()
  })
})
