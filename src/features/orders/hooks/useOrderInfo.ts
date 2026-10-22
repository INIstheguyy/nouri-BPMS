import type { OrderSummary } from '../api/types'

export type OrderTone = 'ok' | 'warn' | 'crit' | 'neutral'
export type OrderInfoIcon = 'clock' | 'phone' | 'truck' | 'alert' | 'check' | 'close'

export interface OrderInfo {
  tone: OrderTone
  badge: string
  icon: OrderInfoIcon
  row: string
  line: string
}

function elapsedLabel(createdAt: string) {
  const ageMinutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000))

  if (ageMinutes < 1) return 'Just now'
  if (ageMinutes < 60) return `${ageMinutes} min`
  if (ageMinutes < 1_440) return `${Math.floor(ageMinutes / 60)} hr`
  return `${Math.floor(ageMinutes / 1_440)} d`
}

export function useOrderInfo(order: OrderSummary): OrderInfo {
  const ageMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60_000),
  )
  const line = `${order.delivery_area} · ${order.offer_name}`

  if (order.order_status === 'NEW') {
    return {
      tone: ageMinutes > 30 ? 'crit' : ageMinutes > 15 ? 'warn' : 'ok',
      badge: elapsedLabel(order.created_at),
      icon: 'clock',
      row: 'Waiting for first call',
      line,
    }
  }

  if (order.order_status === 'UNREACHABLE') {
    return { tone: 'crit', badge: 'Retry', icon: 'alert', row: 'Customer unreachable', line }
  }

  if (order.order_status === 'CONTACTED') {
    return {
      tone: 'warn',
      badge: 'Follow up',
      icon: 'phone',
      row: 'Waiting for confirmation',
      line,
    }
  }

  if (order.order_status === 'CANCELLED') {
    return { tone: 'neutral', badge: 'Cancelled', icon: 'close', row: 'Order cancelled', line }
  }

  if (order.order_status === 'COMPLETED') {
    return { tone: 'ok', badge: 'Done', icon: 'check', row: 'Order complete', line }
  }

  if (order.delivery_status === 'FAILED') {
    return { tone: 'crit', badge: 'Failed', icon: 'alert', row: 'Delivery needs a retry', line }
  }

  if (order.delivery_status === 'NOT_SCHEDULED') {
    return { tone: 'warn', badge: 'Delivery', icon: 'clock', row: 'Ready to schedule', line }
  }

  if (order.delivery_status === 'SCHEDULED') {
    return { tone: 'ok', badge: 'Scheduled', icon: 'truck', row: 'Delivery scheduled', line }
  }

  if (order.delivery_status === 'DISPATCHED') {
    return { tone: 'warn', badge: 'On the way', icon: 'truck', row: 'Out for delivery', line }
  }

  if (
    order.delivery_status === 'DELIVERED' &&
    order.payment_method === 'COD' &&
    order.payment_status === 'UNPAID'
  ) {
    return { tone: 'warn', badge: 'Cash due', icon: 'alert', row: 'Record cash collected', line }
  }

  return { tone: 'ok', badge: 'Delivered', icon: 'check', row: 'Delivery complete', line }
}
