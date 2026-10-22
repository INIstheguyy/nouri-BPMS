import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../../test/render'
import { listOrders } from '../orders/api/orders'
import type { OrderSummary } from '../orders/api/types'
import { CustomersPage } from './CustomersPage'

vi.mock('../orders/api/orders', () => ({ listOrders: vi.fn() }))

const listOrdersMock = vi.mocked(listOrders)

function order(overrides: Partial<OrderSummary> = {}): OrderSummary {
  return {
    order_id: '91000000-0000-4000-8000-000000000001',
    order_number: 'NOU-20261022-00001',
    order_status: 'COMPLETED',
    customer_name: 'Ada Okafor',
    customer_phone: '+2348034444001',
    offer_name: '1 Pack',
    delivery_area: 'Ikeja',
    total_amount: 1_500_000,
    currency: 'NGN',
    payment_method: 'COD',
    payment_status: 'PAID',
    delivery_status: 'DELIVERED',
    source: 'WHATSAPP',
    possible_duplicate: false,
    created_at: '2026-10-20T12:00:00Z',
    total_count: 2,
    ...overrides,
  }
}

describe('CustomersPage', () => {
  beforeEach(() => {
    listOrdersMock.mockResolvedValue({
      total: 2,
      orders: [
        order(),
        order({
          order_id: '91000000-0000-4000-8000-000000000002',
          order_number: 'NOU-20261021-00002',
          order_status: 'CANCELLED',
          total_amount: 2_000_000,
        }),
      ],
    })
  })

  it('groups orders by phone and opens customer history as a nested view', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CustomersPage />)

    expect(await screen.findByText('2 orders · ₦15,000')).toBeInTheDocument()
    expect(screen.getByText('Repeat')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open Ada Okafor' }))

    expect(await screen.findByRole('heading', { name: 'Ada Okafor' })).toBeInTheDocument()
    expect(screen.getByText('Total spend')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'NOU-20261022-00001' })).toHaveAttribute(
      'href',
      '/orders/91000000-0000-4000-8000-000000000001',
    )
    expect(screen.getByRole('link', { name: 'NOU-20261021-00002' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back to people' }))
    expect(await screen.findByRole('heading', { name: 'People' })).toBeInTheDocument()
  })

  it('filters the derived people list by name or phone', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CustomersPage />)
    await screen.findByRole('button', { name: 'Open Ada Okafor' })

    await user.type(screen.getByRole('searchbox', { name: 'Search people' }), 'missing')
    expect(screen.getByText('No people match this search.')).toBeInTheDocument()
  })
})
