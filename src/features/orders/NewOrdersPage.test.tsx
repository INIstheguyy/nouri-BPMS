import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestAuth, renderWithProviders } from '../../test/render'
import { listOrders } from './api/orders'
import type { OrderSummary } from './api/types'
import { runOrderWorkflowCommand } from './api/workflow'
import { NewOrdersPage } from './NewOrdersPage'

vi.mock('./api/orders', () => ({ listOrders: vi.fn() }))
vi.mock('./api/workflow', () => ({ runOrderWorkflowCommand: vi.fn() }))

const listOrdersMock = vi.mocked(listOrders)
const workflowMock = vi.mocked(runOrderWorkflowCommand)

const newOrder: OrderSummary = {
  order_id: '91000000-0000-4000-8000-000000000001',
  order_number: 'NOU-20261022-00001',
  order_status: 'NEW',
  customer_name: 'Ada Okafor',
  customer_phone: '+2348031234567',
  offer_name: '1 Pack',
  delivery_area: 'Ikeja',
  total_amount: 1_500_000,
  currency: 'NGN',
  payment_method: 'COD',
  payment_status: 'UNPAID',
  delivery_status: 'NOT_SCHEDULED',
  source: 'LANDING_PAGE',
  possible_duplicate: false,
  created_at: '2026-10-22T11:40:00Z',
  total_count: 1,
}

describe('NewOrdersPage', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-10-22T12:00:00Z').getTime())
    listOrdersMock.mockReset()
    workflowMock.mockReset()
    listOrdersMock.mockResolvedValue({ total: 1, orders: [newOrder] })
    workflowMock.mockResolvedValue('CONTACTED')
  })

  it('shows the oldest new order and records its call outcome', async () => {
    const user = userEvent.setup()
    renderWithProviders(<NewOrdersPage />, {
      auth: createTestAuth(['order.read', 'order.contact']),
    })

    expect(
      await screen.findByRole('article', { name: 'New order from Ada Okafor' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '20 minutes waiting' })).toBeInTheDocument()
    expect(screen.getByText('₦15,000')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Call customer' }))
    expect(screen.getByRole('dialog', { name: 'Call outcome' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reached them' }))

    await waitFor(() =>
      expect(workflowMock).toHaveBeenCalledWith({ type: 'CONTACT', orderId: newOrder.order_id }),
    )
  })
})
