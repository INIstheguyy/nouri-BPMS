import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestAuth, renderWithProviders } from '../../test/render'
import { listOrders } from '../orders/api/orders'
import type { OrderQueueFilter, OrderSummary } from '../orders/api/types'
import { DashboardPage } from './DashboardPage'
import { useLiveFeed } from './hooks/useLiveFeed'

vi.mock('../orders/api/orders', () => ({ listOrders: vi.fn() }))
vi.mock('./hooks/useLiveFeed', () => ({ useLiveFeed: vi.fn() }))

const listOrdersMock = vi.mocked(listOrders)
const useLiveFeedMock = vi.mocked(useLiveFeed)

function order(queue: OrderQueueFilter, overrides: Partial<OrderSummary> = {}): OrderSummary {
  const statusByQueue = {
    '': 'NEW',
    new: 'NEW',
    'follow-up': 'CONTACTED',
    delivery: 'CONFIRMED',
    failed: 'CONFIRMED',
    done: 'COMPLETED',
  } as const
  return {
    order_id: `91000000-0000-4000-8000-00000000000${queue === 'new' ? '1' : queue === 'follow-up' ? '2' : queue === 'delivery' ? '3' : '4'}`,
    order_number: `NOU-${queue || 'all'}`,
    order_status: statusByQueue[queue],
    customer_name: queue === 'new' ? 'Ada Okafor' : `${queue} Customer`,
    customer_phone: '+2348031234567',
    offer_name: '1 Pack',
    delivery_area: 'Ikeja',
    total_amount: 1_500_000,
    currency: 'NGN',
    payment_method: 'COD',
    payment_status: 'UNPAID',
    delivery_status:
      queue === 'failed' ? 'FAILED' : queue === 'delivery' ? 'SCHEDULED' : 'NOT_SCHEDULED',
    source: 'LANDING_PAGE',
    possible_duplicate: false,
    created_at: '2026-10-22T11:40:00Z',
    total_count: 1,
    ...overrides,
  }
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-10-22T12:00:00Z').getTime())
    listOrdersMock.mockReset()
    listOrdersMock.mockImplementation((filters) =>
      Promise.resolve({
        total: 1,
        orders: [order(filters.queue)],
      }),
    )
    useLiveFeedMock.mockReturnValue({
      data: [
        {
          event_id: '93000000-0000-4000-8000-000000000001',
          order_id: '91000000-0000-4000-8000-000000000001',
          order_number: 'NOU-new',
          action: 'CUSTOMER_CONTACTED',
          actor_name: 'Kemi',
          note: null,
          created_at: '2026-10-22T11:58:00Z',
        },
      ],
      isFetching: false,
    } as ReturnType<typeof useLiveFeed>)
  })

  it('renders the SLA hero, operational rails, and recent activity', async () => {
    renderWithProviders(<DashboardPage />, {
      auth: createTestAuth(['order.read', 'dashboard.operations.read']),
    })

    expect(await screen.findByText('Waiting for a call')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: '20 minutes of the 30 minute call SLA' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Call Ada' })).toHaveAttribute(
      'href',
      '/orders/91000000-0000-4000-8000-000000000001',
    )
    expect(screen.getByRole('heading', { name: 'Follow up' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Delivery desk' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Needs a retry' })).toBeInTheDocument()
    expect(screen.getByText('Kemi reached a customer')).toBeInTheDocument()
  })
})
