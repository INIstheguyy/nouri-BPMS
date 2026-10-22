import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestAuth, renderWithProviders } from '../../test/render'
import { getOrderDetail, addOrderNote } from './api/orders'
import type { OrderDetail } from './api/types'
import { OrderDetailPage } from './OrderDetailPage'

vi.mock('./api/orders', () => ({ getOrderDetail: vi.fn(), addOrderNote: vi.fn() }))

const getOrderDetailMock = vi.mocked(getOrderDetail)
const addOrderNoteMock = vi.mocked(addOrderNote)

const order: OrderDetail = {
  id: '91000000-0000-4000-8000-000000000001',
  orderNumber: 'NOU-20261022-00001',
  status: 'NEW',
  source: 'LANDING_PAGE',
  sourceDetail: null,
  possibleDuplicate: false,
  createdAt: '2026-10-22T10:00:00Z',
  updatedAt: '2026-10-22T10:00:00Z',
  currency: 'NGN',
  subtotalAmount: 1_500_000,
  discountAmount: 0,
  deliveryFeeAmount: 0,
  totalAmount: 1_500_000,
  paymentMethod: 'COD',
  customerNote: 'Please call before delivery',
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
  timeline: [
    {
      id: '93000000-0000-4000-8000-000000000001',
      action: 'ORDER_CREATED',
      fromState: null,
      toState: 'NEW',
      actorUserId: 'test-profile-id',
      actorName: 'Kemi',
      note: null,
      metadata: {},
      createdAt: '2026-10-22T10:00:00Z',
    },
    {
      id: '93000000-0000-4000-8000-000000000002',
      action: 'ORDER_NOTE_ADDED',
      fromState: null,
      toState: null,
      actorUserId: 'test-profile-id',
      actorName: 'Kemi',
      note: 'Customer prefers an afternoon call.',
      metadata: {},
      createdAt: '2026-10-22T10:05:00Z',
    },
  ],
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/orders/:orderId" element={<OrderDetailPage />} />
    </Routes>,
    {
      route: `/orders/${order.id}`,
      auth: createTestAuth([
        'order.read',
        'order.update',
        'order.contact',
        'order.confirm',
        'order.schedule',
        'order.dispatch',
        'order.deliver',
        'payment.update',
      ]),
    },
  )
}

describe('OrderDetailPage', () => {
  beforeEach(() => {
    getOrderDetailMock.mockReset()
    addOrderNoteMock.mockReset()
    getOrderDetailMock.mockResolvedValue(order)
    addOrderNoteMock.mockResolvedValue('93000000-0000-4000-8000-000000000003')
  })

  it('renders the progress path and human-readable activity thread', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Ada Okafor' })).toBeInTheDocument()
    expect(screen.getByLabelText('Order progress')).toHaveTextContent(
      '1New2Called3Confirmed4Delivery5Paid',
    )
    expect(screen.getByText('Kemi created the order')).toBeInTheDocument()
    expect(screen.getByText('Customer prefers an afternoon call.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Call them' })).toBeInTheDocument()
  })

  it('opens the call sheet and writes a team note into the timeline', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('heading', { name: 'Ada Okafor' })

    await user.click(screen.getByRole('button', { name: 'Call them' }))
    expect(screen.getByRole('dialog', { name: 'Call outcome' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))

    await user.type(screen.getByLabelText('Note for the team'), 'Try again after lunch')
    await user.click(screen.getByRole('button', { name: 'Send note' }))
    expect(addOrderNoteMock).toHaveBeenCalledWith(order.id, 'Try again after lunch')
  })
})
