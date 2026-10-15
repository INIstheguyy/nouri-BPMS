import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getCustomerDetail } from './api'
import { CustomerDetailPage } from './CustomerDetailPage'

vi.mock('./api', async (importOriginal) => {
  const original = await importOriginal<typeof import('./api')>()
  return { ...original, getCustomerDetail: vi.fn() }
})

const getCustomerDetailMock = vi.mocked(getCustomerDetail)

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/customers/92000000-0000-4000-8000-000000000001']}>
        <Routes>
          <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CustomerDetailPage', () => {
  beforeEach(() => {
    getCustomerDetailMock.mockReset()
    getCustomerDetailMock.mockResolvedValue({
      id: '92000000-0000-4000-8000-000000000001',
      firstName: 'Repeat',
      lastName: 'Customer',
      primaryPhone: '+2348034444001',
      whatsappPhone: null,
      alternativePhone: null,
      email: 'repeat@example.test',
      state: 'Lagos',
      city: 'Lagos',
      area: 'Ikeja',
      defaultAddress: '10 Customer Street',
      createdAt: '2026-10-10T12:00:00Z',
      summary: {
        totalOrders: 3,
        deliveredOrders: 2,
        cancelledOrders: 1,
        failedDeliveries: 1,
        totalPaidSpend: 5_000_000,
        currency: 'NGN',
        firstAcquisitionSource: 'WHATSAPP',
        mostRecentAcquisitionSource: 'PHONE',
      },
      orderHistory: [
        {
          id: '91000000-0000-4000-8000-000000000001',
          orderNumber: 'NOU-20261013-00001',
          status: 'CONFIRMED',
          source: 'PHONE',
          offerName: '1 Pack',
          totalAmount: 2_500_000,
          currency: 'NGN',
          paymentMethod: 'COD',
          paymentStatus: 'UNPAID',
          deliveryStatus: 'FAILED',
          createdAt: '2026-10-13T12:00:00Z',
        },
      ],
    })
  })

  it('shows operational summaries and links order history back to order detail', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Repeat Customer' })).toBeInTheDocument()
    expect(screen.getByText('₦50,000')).toBeInTheDocument()
    expect(screen.getByText('WHATSAPP')).toBeInTheDocument()
    expect(screen.getAllByText('PHONE')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'NOU-20261013-00001' })).toHaveAttribute(
      'href',
      '/orders/91000000-0000-4000-8000-000000000001',
    )
    expect(getCustomerDetailMock).toHaveBeenCalledWith('92000000-0000-4000-8000-000000000001')
  })
})
