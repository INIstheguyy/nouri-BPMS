import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AuthContext } from '../auth/AuthContext'
import type { AuthContextValue } from '../auth/types'
import type { OrderDetail, PrepaidInitialization } from './api/types'
import { initializePrepaidPayment, markCodPaid } from './api/payments'
import { PaymentActions } from './PaymentActions'

vi.mock('./api/payments', () => ({ initializePrepaidPayment: vi.fn(), markCodPaid: vi.fn() }))

const markCodPaidMock = vi.mocked(markCodPaid)
const initializePrepaidMock = vi.mocked(initializePrepaidPayment)

function renderActions(method: 'COD' | 'PREPAID', hasPaymentPermission = true) {
  const auth: AuthContextValue = {
    session: null,
    user: null,
    access: {
      profileId: 'profile',
      email: 'manager@example.test',
      fullName: 'Payment Manager',
      roles: ['ORDER_MANAGER'],
      permissions: hasPaymentPermission ? ['payment.update'] : [],
    },
    status: 'authenticated',
    error: null,
    sessionExpired: false,
    hasPermission: (permission) => hasPaymentPermission && permission === 'payment.update',
    refreshAccess: vi.fn(),
    signOut: vi.fn(),
  }
  const order = {
    id: '91000000-0000-4000-8000-000000000001',
    status: 'CONFIRMED',
    paymentMethod: method,
    payment: {
      method,
      status: method === 'COD' ? 'UNPAID' : 'PENDING',
      providerReference: null,
    },
    delivery: { status: 'DELIVERED' },
  } as OrderDetail
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <AuthContext.Provider value={auth}>
      <QueryClientProvider client={client}>
        <PaymentActions order={order} />
      </QueryClientProvider>
    </AuthContext.Provider>,
  )
}

describe('PaymentActions', () => {
  it('requires explicit confirmation and sends the COD collection note', async () => {
    markCodPaidMock.mockReset()
    markCodPaidMock.mockResolvedValue('PAID')
    const user = userEvent.setup()
    renderActions('COD')

    await user.click(screen.getByRole('button', { name: 'Mark COD paid' }))
    const dialog = screen.getByRole('dialog', { name: 'Mark COD paid' })
    await user.type(within(dialog).getByLabelText(/Collection note/), 'Cash received by courier')
    await user.click(within(dialog).getByRole('button', { name: 'Confirm cash collected' }))

    await waitFor(() =>
      expect(markCodPaidMock).toHaveBeenCalledWith(
        '91000000-0000-4000-8000-000000000001',
        'Cash received by courier',
      ),
    )
  })

  it('initializes prepaid in test mode without offering a browser paid command', async () => {
    initializePrepaidMock.mockReset()
    initializePrepaidMock.mockResolvedValue({
      provider: 'mock',
      reference: 'mock_reference_001',
      amount: 4200000,
      currency: 'NGN',
      alreadyInitialized: false,
      mode: 'test',
    } satisfies PrepaidInitialization)
    const user = userEvent.setup()
    renderActions('PREPAID')

    expect(screen.queryByRole('button', { name: /paid/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Initialize test payment' }))

    expect(await screen.findByText(/mock_reference_001/)).toBeInTheDocument()
    expect(initializePrepaidMock).toHaveBeenCalledWith('91000000-0000-4000-8000-000000000001')
    expect(markCodPaidMock).not.toHaveBeenCalled()
  })

  it('does not expose payment actions without payment update permission', () => {
    renderActions('COD', false)
    expect(screen.queryByRole('button', { name: 'Mark COD paid' })).not.toBeInTheDocument()
  })
})
