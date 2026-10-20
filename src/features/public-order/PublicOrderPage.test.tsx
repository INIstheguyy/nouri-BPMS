import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../../test/render'
import { listActiveOffers } from '../catalogue/api'
import { createPublicOrder } from './api'
import { PublicOrderPage } from './PublicOrderPage'

vi.mock('./api', () => ({ createPublicOrder: vi.fn() }))
vi.mock('../catalogue/api', () => ({ listActiveOffers: vi.fn() }))

const listOffersMock = vi.mocked(listActiveOffers)
const createOrderMock = vi.mocked(createPublicOrder)

function renderPage() {
  return renderWithProviders(<PublicOrderPage />, {
    route: '/order?utm_source=tiktok&utm_campaign=test-campaign',
  })
}

describe('PublicOrderPage', () => {
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
        items: [
          {
            id: '30000000-0000-4000-8000-000000000001',
            name: 'Nouri Daily Fibre',
            quantity: 1,
            itemType: 'PRODUCT',
          },
        ],
      },
    ])
  })

  it('submits customer and attribution data without a client price', async () => {
    createOrderMock.mockResolvedValue({
      orderNumber: 'NOU-20261013-00001',
      nextStepMessage: 'Our team will contact you.',
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByLabelText(/1 Pack/))
    await user.type(screen.getByLabelText('Full name'), 'Ada Okafor')
    await user.type(screen.getByLabelText('WhatsApp number'), '08031234567')
    await user.type(screen.getByLabelText('Area'), 'Yaba')
    await user.type(screen.getByLabelText('Delivery address'), '12 Example Street')
    await user.click(screen.getByRole('button', { name: 'Place order' }))

    expect(await screen.findByText(/Order number:/)).toHaveTextContent('NOU-20261013-00001')
    expect(createOrderMock).toHaveBeenCalledOnce()
    const [payload, key] = createOrderMock.mock.calls[0] ?? []
    expect(key).toMatch(/^public-order-/)
    expect(payload).toMatchObject({
      offerId: '20000000-0000-4000-8000-000000000001',
      paymentMethod: 'COD',
      customer: { name: 'Ada Okafor', whatsapp: '08031234567' },
      attribution: { source: 'TIKTOK', campaign: 'test-campaign' },
    })
    expect(payload).not.toHaveProperty('price')
  })
})
