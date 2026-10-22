import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../../test/render'
import { getExecutiveDashboard, getRevenueSeries } from '../dashboard/api'
import { AnalyticsPage } from './AnalyticsPage'

vi.mock('../dashboard/api', () => ({
  getExecutiveDashboard: vi.fn(),
  getRevenueSeries: vi.fn(),
}))

const dashboardMock = vi.mocked(getExecutiveDashboard)
const revenueMock = vi.mocked(getRevenueSeries)

describe('AnalyticsPage', () => {
  beforeEach(() => {
    dashboardMock.mockResolvedValue({
      dateFrom: '2026-09-23',
      dateTo: '2026-10-22',
      currency: 'NGN',
      metrics: {
        submittedOrders: 100,
        confirmedOrders: 72,
        deliveredOrders: 58,
        completedOrders: 50,
        paidOrders: 45,
        cancelledOrders: 8,
        failedDeliveries: 5,
        submittedValue: 5_000_000,
        deliveredRevenue: 3_000_000,
        paidRevenue: 2_500_000,
        codSuccessRate: 82,
        cancellationRate: 8,
        failedDeliveryRate: 5,
        confirmationConversion: 72,
        deliveryConversion: 58,
        paidConversion: 45,
      },
      sourceBreakdown: [
        {
          source: 'WHATSAPP',
          submittedOrders: 60,
          deliveredOrders: 36,
          paidOrders: 30,
          submittedValue: 3_000_000,
          paidRevenue: 1_500_000,
        },
      ],
    })
    revenueMock.mockResolvedValue([
      { date: '2026-10-20', revenue: 500_000 },
      { date: '2026-10-21', revenue: 750_000 },
      { date: '2026-10-22', revenue: 1_250_000 },
    ])
  })

  it('renders revenue, the conversion funnel, and delivery health', async () => {
    renderWithProviders(<AnalyticsPage />)

    expect(await screen.findByText('₦25,000')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Paid revenue over time' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Order funnel' })).toBeInTheDocument()
    expect(screen.getByText('Submitted')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Cash collected: 45%' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Cancelled rate: 8%' })).toBeInTheDocument()
    expect(screen.getByText('WHATSAPP')).toBeInTheDocument()
  })

  it('refetches analytics when the period changes', async () => {
    renderWithProviders(<AnalyticsPage />)
    await screen.findByText('₦25,000')

    fireEvent.click(screen.getByRole('button', { name: '7 days' }))

    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true')
    expect(dashboardMock).toHaveBeenCalledTimes(2)
    expect(revenueMock).toHaveBeenCalledTimes(2)
  })
})
