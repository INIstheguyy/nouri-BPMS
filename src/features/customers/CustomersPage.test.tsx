import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listCustomers } from './api'
import { CustomersPage } from './CustomersPage'

vi.mock('./api', async (importOriginal) => {
  const original = await importOriginal<typeof import('./api')>()
  return { ...original, listCustomers: vi.fn() }
})

const listCustomersMock = vi.mocked(listCustomers)

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CustomersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CustomersPage', () => {
  beforeEach(() => {
    listCustomersMock.mockReset()
    listCustomersMock.mockResolvedValue({
      total: 1,
      customers: [
        {
          customer_id: '92000000-0000-4000-8000-000000000001',
          customer_name: 'Repeat Customer',
          primary_phone: '+2348034444001',
          state: 'Lagos',
          city: 'Lagos',
          area: 'Ikeja',
          total_orders: 3,
          delivered_orders: 2,
          last_order_date: '2026-10-13T12:00:00Z',
          last_order_status: 'CONFIRMED',
          total_paid_spend: 5_000_000,
          currency: 'NGN',
          total_count: 1,
        },
      ],
    })
  })

  it('renders aggregates and sends a name or phone search to the RPC adapter', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('link', { name: 'Repeat Customer' })).toBeInTheDocument()
    expect(screen.getByText('+2348034444001')).toBeInTheDocument()
    expect(screen.getByText('₦50,000')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Search by name or phone'), 'Repeat')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() =>
      expect(listCustomersMock).toHaveBeenLastCalledWith({
        search: 'Repeat',
        page: 1,
        pageSize: 20,
      }),
    )
  })
})
