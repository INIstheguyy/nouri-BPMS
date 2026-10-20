import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AuthContext } from '../auth/AuthContext'
import type { AuthContextValue } from '../auth/types'
import type { OrderDetail } from './api/types'
import { runOrderWorkflowCommand } from './api/workflow'
import { OrderWorkflowActions } from './OrderWorkflowActions'

vi.mock('./api/workflow', () => ({ runOrderWorkflowCommand: vi.fn() }))

const workflowMock = vi.mocked(runOrderWorkflowCommand)

const order: OrderDetail = {
  id: '91000000-0000-4000-8000-000000000001',
  orderNumber: 'NOU-20261013-00001',
  status: 'NEW',
  source: 'LANDING_PAGE',
  sourceDetail: null,
  possibleDuplicate: false,
  createdAt: '2026-10-13T12:00:00Z',
  updatedAt: '2026-10-13T12:00:00Z',
  currency: 'NGN',
  subtotalAmount: 1_500_000,
  discountAmount: 0,
  deliveryFeeAmount: 0,
  totalAmount: 1_500_000,
  paymentMethod: 'COD',
  customerNote: null,
  internalNote: null,
  customer: {
    id: '92000000-0000-4000-8000-000000000001',
    firstName: 'Ada',
    lastName: 'Okafor',
    phone: '+2348031234567',
    whatsappPhone: '+2348031234567',
    alternativePhone: null,
    email: null,
  },
  offer: { id: '20000000-0000-4000-8000-000000000001', name: '1 Pack', code: 'ONE_PACK' },
  items: [],
  payment: {
    status: 'UNPAID',
    method: 'COD',
    amount: 1_500_000,
    provider: null,
    providerReference: null,
    paidAt: null,
  },
  delivery: {
    status: 'NOT_SCHEDULED',
    recipientName: 'Ada Okafor',
    recipientPhone: '+2348031234567',
    state: 'Lagos',
    city: 'Lagos',
    area: 'Yaba',
    addressLine: '12 Example Street',
    landmark: null,
    scheduledDate: null,
    deliveryWindow: null,
    courierName: null,
    trackingReference: null,
  },
  attribution: {},
  timeline: [],
}

function renderActions(permissions: string[]) {
  const auth: AuthContextValue = {
    session: null,
    user: null,
    access: {
      profileId: 'profile',
      email: 'staff@example.test',
      fullName: 'Staff User',
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
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <AuthContext.Provider value={auth}>
      <QueryClientProvider client={client}>
        <OrderWorkflowActions order={order} />
      </QueryClientProvider>
    </AuthContext.Provider>,
  )
}

describe('OrderWorkflowActions', () => {
  it('shows only permitted valid actions and confirms through the protected command', async () => {
    workflowMock.mockReset()
    workflowMock.mockResolvedValue('CONFIRMED')
    const user = userEvent.setup()
    renderActions(['order.contact', 'order.confirm', 'order.cancel'])

    expect(screen.getByRole('button', { name: 'Mark contacted' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark unreachable' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Admin override' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirm order' }))
    const dialog = screen.getByRole('dialog', { name: 'Confirm order' })
    expect(within(dialog).getByText('Ada Okafor')).toBeInTheDocument()
    expect(within(dialog).getByText(/15,000/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Confirm order' }))

    expect(workflowMock).toHaveBeenCalledWith(
      { type: 'CONFIRM', orderId: order.id },
      expect.anything(),
    )
  })
})
