import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestAuth, renderWithProviders } from '../../test/render'
import { inviteStaff, listStaff, updateStaffAccess } from './api'
import { StaffPage } from './StaffPage'

vi.mock('./api', () => ({
  inviteStaff: vi.fn(),
  listStaff: vi.fn(),
  updateStaffAccess: vi.fn(),
}))

const listStaffMock = vi.mocked(listStaff)
const updateStaffAccessMock = vi.mocked(updateStaffAccess)
const inviteStaffMock = vi.mocked(inviteStaff)

describe('StaffPage', () => {
  beforeEach(() => {
    listStaffMock.mockResolvedValue({
      total: 2,
      staff: [
        {
          user_id: 'test-profile-id',
          email: 'exec@nouri.test',
          full_name: 'Executive User',
          active: true,
          role_code: 'EXECUTIVE_ADMIN',
          created_at: '2026-10-01T10:00:00Z',
          total_count: 2,
        },
        {
          user_id: 'staff-profile-id',
          email: 'kemi@nouri.test',
          full_name: 'Kemi Adeyemi',
          active: true,
          role_code: 'ORDER_MANAGER',
          created_at: '2026-10-02T10:00:00Z',
          total_count: 2,
        },
      ],
    })
    updateStaffAccessMock.mockResolvedValue({ id: 'staff-profile-id' })
    inviteStaffMock.mockResolvedValue({ id: 'new-profile-id' })
  })

  function renderPage() {
    const auth = createTestAuth(['staff.read', 'staff.manage'])
    auth.access = auth.access
      ? { ...auth.access, fullName: 'Executive User', roles: ['EXECUTIVE_ADMIN'] }
      : null
    return renderWithProviders(<StaffPage />, { auth })
  }

  it('marks the current user and optimistically toggles another staff member', async () => {
    const user = userEvent.setup()
    updateStaffAccessMock.mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(await screen.findByText('Executive User', { selector: 'strong' })).toHaveTextContent(
      '(you)',
    )
    expect(
      screen.getByRole('checkbox', { name: 'Active access for Executive User' }),
    ).toBeDisabled()
    const kemiToggle = screen.getByRole('checkbox', { name: 'Active access for Kemi Adeyemi' })
    expect(kemiToggle).toBeChecked()

    await user.click(kemiToggle)

    expect(kemiToggle).not.toBeChecked()
    expect(updateStaffAccessMock).toHaveBeenCalledWith(
      { userId: 'staff-profile-id', active: false },
      expect.anything(),
    )
  })

  it('opens the invite sheet and submits through the secure invitation adapter', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Kemi Adeyemi')

    await user.click(screen.getByRole('button', { name: '+ Invite' }))
    await user.type(screen.getByLabelText('Full name'), 'Tola James')
    await user.type(screen.getByLabelText('Email'), 'TOLA@example.com')
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))

    expect(inviteStaffMock).toHaveBeenCalledWith(
      {
        email: 'tola@example.com',
        fullName: 'Tola James',
        roleCode: 'ORDER_MANAGER',
      },
      expect.anything(),
    )
    expect(await screen.findByText('Invitation sent successfully.')).toBeInTheDocument()
  })
})
