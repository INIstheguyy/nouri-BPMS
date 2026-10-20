import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../../test/render'
import { listDeliveryAttention } from './api/delivery'
import { listOrders } from './api/orders'
import { OrdersPage } from './OrdersPage'

vi.mock('./api/delivery', () => ({ listDeliveryAttention: vi.fn() }))
vi.mock('./api/orders', () => ({ listOrders: vi.fn() }))

const listOrdersMock = vi.mocked(listOrders)
const listDeliveryAttentionMock = vi.mocked(listDeliveryAttention)

function renderPage() {
  return renderWithProviders(<OrdersPage />)
}

describe('OrdersPage', () => {
  beforeEach(() => {
    listOrdersMock.mockReset()
    listDeliveryAttentionMock.mockReset()
    listDeliveryAttentionMock.mockResolvedValue([
      {
        order_id: '91000000-0000-4000-8000-000000000101',
        order_number: 'NOU-20261013-00101',
        customer_name: 'Scheduled Customer',
        customer_phone: '+2348030000101',
        delivery_status: 'SCHEDULED',
        delivery_window: 'Morning',
        failure_reason_code: null,
        scheduled_date: '2026-10-13',
        area: 'Yaba',
        state: 'Lagos',
        updated_at: '2026-10-13T12:00:00Z',
      },
      {
        order_id: '91000000-0000-4000-8000-000000000102',
        order_number: 'NOU-20261013-00102',
        customer_name: 'Failed Customer',
        customer_phone: '+2348030000102',
        delivery_status: 'FAILED',
        delivery_window: null,
        failure_reason_code: 'NO_ANSWER',
        scheduled_date: '2026-10-12',
        area: 'Ikeja',
        state: 'Lagos',
        updated_at: '2026-10-13T12:00:00Z',
      },
    ])
    listOrdersMock.mockResolvedValue({
      total: 1,
      orders: [
        {
          order_id: '91000000-0000-4000-8000-000000000001',
          order_number: 'NOU-20261013-00001',
          order_status: 'NEW',
          customer_name: 'Ada Okafor',
          customer_phone: '+2348031234567',
          offer_name: '1 Pack',
          total_amount: 1_500_000,
          currency: 'NGN',
          payment_method: 'COD',
          payment_status: 'UNPAID',
          delivery_status: 'NOT_SCHEDULED',
          source: 'LANDING_PAGE',
          possible_duplicate: false,
          created_at: '2026-10-13T12:00:00Z',
          total_count: 1,
        },
      ],
    })
  })

  it('renders operational order data and sends search filters to the RPC adapter', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('link', { name: 'NOU-20261013-00001' })).toBeInTheDocument()
    expect(screen.getByText('Ada Okafor')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Contact customer' })).toHaveAttribute(
      'href',
      '/orders/91000000-0000-4000-8000-000000000001',
    )
    expect(screen.getByText('NOU-20261013-00101')).toBeInTheDocument()
    expect(screen.getByText('NOU-20261013-00102')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Search'), '08031234567')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() =>
      expect(listOrdersMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: '08031234567', page: 1 }),
      ),
    )
  })
})
