import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AuthLayout } from './AuthLayout'

describe('AuthLayout', () => {
  it('renders the shared Nouri team access layout outside the app shell', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<h2>Sign in to Nouri</h2>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Nouri' })).toHaveAttribute('href', '/login')
    expect(screen.getByText('Team access')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sign in to Nouri' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
