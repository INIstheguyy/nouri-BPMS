import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createTestAuth, renderWithProviders } from '../../test/render'
import { updateMyProfileName } from './api'
import { SettingsPage } from './SettingsPage'

vi.mock('./api', () => ({ updateMyProfileName: vi.fn() }))

const updateNameMock = vi.mocked(updateMyProfileName)

describe('SettingsPage', () => {
  it('edits the current name and exposes session controls', async () => {
    const user = userEvent.setup()
    const auth = createTestAuth(['settings.read'])
    auth.access = auth.access
      ? { ...auth.access, fullName: 'Executive User', roles: ['EXECUTIVE_ADMIN'] }
      : null
    auth.refreshAccess = vi.fn()
    updateNameMock.mockResolvedValue('Executive Ada')
    renderWithProviders(<SettingsPage />, { auth })

    const name = screen.getByLabelText('Your name')
    await user.clear(name)
    await user.type(name, 'Executive Ada')
    await user.click(screen.getByRole('button', { name: 'Save name' }))

    expect(updateNameMock).toHaveBeenCalledWith('Executive Ada', expect.anything())
    expect(await screen.findByText('Your name has been updated.')).toBeInTheDocument()
    expect(auth.refreshAccess).toHaveBeenCalled()
    expect(screen.getByLabelText('Your role')).toHaveValue('Executive Admin')
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Remove account' })).toHaveAttribute(
      'href',
      expect.stringContaining('mailto:'),
    )
  })
})
