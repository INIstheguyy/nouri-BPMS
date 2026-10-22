import { describe, expect, it, vi } from 'vitest'

import type { OrderSummary } from '../api/types'
import { useOrderInfo } from './useOrderInfo'

const baseOrder: OrderSummary = {
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

describe('useOrderInfo', () => {
  it('promotes new orders through the SLA urgency tones', () => {
    const now = vi.spyOn(Date, 'now')
    now.mockReturnValue(new Date('2026-10-22T12:00:00Z').getTime())
    expect(useOrderInfo(baseOrder)).toMatchObject({ tone: 'warn', badge: '20 min' })

    now.mockReturnValue(new Date('2026-10-22T12:20:00Z').getTime())
    expect(useOrderInfo(baseOrder)).toMatchObject({ tone: 'crit', badge: '40 min' })
    now.mockRestore()
  })

  it('marks failed deliveries as critical independently of order age', () => {
    expect(
      useOrderInfo({
        ...baseOrder,
        order_status: 'CONFIRMED',
        delivery_status: 'FAILED',
      }),
    ).toMatchObject({ tone: 'crit', badge: 'Failed', row: 'Delivery needs a retry' })
  })
})
