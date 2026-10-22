import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { signInWithPassword } from './api'
import { LoginPage } from './LoginPage'

vi.mock('./api', () => ({ signInWithPassword: vi.fn() }))

const signInMock = vi.mocked(signInWithPassword)

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<h1>Dashboard</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => signInMock.mockReset())

  it('validates credentials before calling Supabase', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(signInMock).not.toHaveBeenCalled()
  })

  it('signs in with valid credentials and continues to the dashboard', async () => {
    signInMock.mockResolvedValue(true)
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'manager@nouri.test')
    await user.type(screen.getByLabelText('Password'), 'a-secure-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(signInMock).toHaveBeenCalledWith('manager@nouri.test', 'a-secure-password')
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('shows a generic error when Supabase rejects the login', async () => {
    signInMock.mockResolvedValue(false)
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'manager@nouri.test')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(
      await screen.findByText(/email or password is incorrect, or this account cannot sign in/i),
    ).toBeInTheDocument()
  })
})
