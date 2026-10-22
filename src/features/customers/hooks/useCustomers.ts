import { useMemo } from 'react'

import type { OrderSummary } from '../../orders/api/types'

export interface CustomerSummary {
  name: string
  phone: string
  area: string
  currency: string
  orders: OrderSummary[]
  totalSpend: number
}

export function useCustomers(orders: OrderSummary[]) {
  return useMemo(() => {
    const customers = new Map<string, CustomerSummary>()

    for (const order of orders) {
      const existing = customers.get(order.customer_phone)
      if (existing) {
        existing.orders.push(order)
        if (order.order_status !== 'CANCELLED') existing.totalSpend += order.total_amount
        continue
      }

      customers.set(order.customer_phone, {
        name: order.customer_name,
        phone: order.customer_phone,
        area: order.delivery_area,
        currency: order.currency,
        orders: [order],
        totalSpend: order.order_status === 'CANCELLED' ? 0 : order.total_amount,
      })
    }

    return [...customers.values()].sort(
      (left, right) =>
        right.orders.length - left.orders.length || left.name.localeCompare(right.name),
    )
  }, [orders])
}
