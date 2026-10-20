import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AuthContext } from '../auth/AuthContext'
import type { AuthContextValue } from '../auth/types'
import type { OrderDetail } from './api/types'
import { runDeliveryCommand } from './api/delivery'
import { DeliveryWorkflowActions } from './DeliveryWorkflowActions'

vi.mock('./api/delivery', () => ({ runDeliveryCommand: vi.fn() }))

const deliveryCommandMock = vi.mocked(runDeliveryCommand)

function renderActions() {
  const auth: AuthContextValue = {
    session: null,
    user: null,
    access: {
      profileId: 'profile',
      email: 'manager@example.test',
      fullName: 'Delivery Manager',
      roles: ['ORDER_MANAGER'],
      permissions: ['order.schedule', 'order.dispatch'],
    },
    status: 'authenticated',
    error: null,
    sessionExpired: false,
    hasPermission: (permission) => ['order.schedule', 'order.dispatch'].includes(permission),
    refreshAccess: vi.fn(),
    signOut: vi.fn(),
  }
  const order = {
    id: '91000000-0000-4000-8000-000000000001',
    status: 'CONFIRMED',
    paymentMethod: 'COD',
    payment: { status: 'UNPAID' },
    delivery: {
      status: 'SCHEDULED',
      scheduledDate: '2099-10-20',
      deliveryWindow: 'Morning',
      recipientName: 'Ada Okafor',
      recipientPhone: '+2348031234567',
      state: 'Lagos',
      city: 'Lagos',
      area: 'Yaba',
      addressLine: '12 Example Street',
      landmark: null,
      courierName: null,
      trackingReference: null,
    },
  } as OrderDetail
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <AuthContext.Provider value={auth}>
      <QueryClientProvider client={client}>
        <DeliveryWorkflowActions order={order} />
      </QueryClientProvider>
    </AuthContext.Provider>,
  )
}

describe('DeliveryWorkflowActions', () => {
  it('shows valid scheduled actions and dispatches through the protected command', async () => {
    deliveryCommandMock.mockReset()
    deliveryCommandMock.mockResolvedValue('DISPATCHED')
    const user = userEvent.setup()
    renderActions()

    expect(screen.getByRole('button', { name: 'Reschedule' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Dispatch order' }))
    const dialog = screen.getByRole('dialog', { name: 'Dispatch order' })
    await user.type(within(dialog).getByLabelText(/Courier name/), 'Swift Courier')
    await user.type(within(dialog).getByLabelText(/Tracking reference/), 'TRACK-001')
    await user.click(within(dialog).getByRole('button', { name: 'Dispatch order' }))

    expect(deliveryCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'DISPATCH',
        orderId: '91000000-0000-4000-8000-000000000001',
        courierName: 'Swift Courier',
        trackingReference: 'TRACK-001',
      }),
      expect.anything(),
    )
  })
})
