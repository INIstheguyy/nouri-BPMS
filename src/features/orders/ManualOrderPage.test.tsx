import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listActiveOffers } from '../catalogue/api'
import { createManualOrder } from './api/orders'
import { ManualOrderPage } from './ManualOrderPage'

vi.mock('../catalogue/api', () => ({ listActiveOffers: vi.fn() }))
vi.mock('./api/orders', () => ({ createManualOrder: vi.fn() }))

const listOffersMock = vi.mocked(listActiveOffers)
const createOrderMock = vi.mocked(createManualOrder)

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/orders/new']}>
        <Routes>
          <Route path="/orders/new" element={<ManualOrderPage />} />
          <Route path="/orders/:orderId" element={<div>Created order detail</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ManualOrderPage', () => {
  beforeEach(() => {
    listOffersMock.mockReset()
    createOrderMock.mockReset()
    listOffersMock.mockResolvedValue([
      {
        id: '20000000-0000-4000-8000-000000000001',
        code: 'ONE_PACK',
        name: '1 Pack',
        basePrice: 1_500_000,
        prepaidPrice: null,
        currency: 'NGN',
        sortOrder: 10,
        items: [],
      },
    ])
    createOrderMock.mockResolvedValue({
      order_id: '91000000-0000-4000-8000-000000000001',
      order_number: 'NOU-20261013-00001',
      possible_duplicate: false,
    })
  })

  it('creates a manual order without accepting a client price', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('First name'), 'Chidi')
    await user.type(screen.getByLabelText('Primary phone'), '08034445566')
    await user.selectOptions(
      await screen.findByLabelText('Package'),
      '20000000-0000-4000-8000-000000000001',
    )
    await user.type(screen.getByLabelText('Area'), 'Ikeja')
    await user.type(screen.getByLabelText('Address'), '44 Operations Avenue')
    await user.click(screen.getByRole('button', { name: 'Create order' }))

    expect(await screen.findByText('Created order detail')).toBeInTheDocument()
    const submitted = createOrderMock.mock.calls[0]?.[0]
    expect(submitted).toEqual(
      expect.objectContaining({
        firstName: 'Chidi',
        phone: '08034445566',
        offerId: '20000000-0000-4000-8000-000000000001',
        source: 'WHATSAPP',
      }),
    )
    expect(submitted).not.toHaveProperty('price')
  })
})
