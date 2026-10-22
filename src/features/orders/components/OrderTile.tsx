import { Link } from 'react-router-dom'

import { formatMoney } from '../../../shared/lib/money'
import { SlaRing } from '../../../shared/ui/SlaRing'
import type { OrderSummary } from '../api/types'
import { useOrderInfo } from '../hooks/useOrderInfo'

function orderAgeMinutes(createdAt: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000))
}

export function OrderTile({ order }: { order: OrderSummary }) {
  const info = useOrderInfo(order)
  const age = orderAgeMinutes(order.created_at)

  return (
    <Link
      aria-label={`${order.customer_name}, ${order.order_number}`}
      className="grid w-[205px] shrink-0 grid-rows-[auto_1fr_auto] gap-4 rounded-[20px] border border-line bg-surface p-4 text-ink no-underline shadow-[0_10px_28px_rgb(13_31_23/0.05)] transition-transform hover:-translate-y-1"
      to={`/orders/${order.order_id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="relative grid size-14 place-items-center">
          <SlaRing pct={age / 30} size={56} tone={info.tone} pulse={info.tone === 'crit'} />
          <span className="absolute font-display text-[10px] font-black">{info.badge}</span>
        </div>
        <span className="rounded-full bg-surface-2 px-2 py-1 text-[10px] font-bold text-ink-2">
          {order.payment_method}
        </span>
      </div>
      <div className="min-w-0 self-end">
        <strong className="block truncate font-display text-base font-bold">
          {order.customer_name}
        </strong>
        <span className="mt-1 block truncate text-xs text-ink-2">
          {order.delivery_area} · {info.row}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="truncate text-[10px] font-bold text-ink-2">{order.order_number}</span>
        <strong className="font-display text-sm">
          {formatMoney(order.total_amount, order.currency)}
        </strong>
      </div>
    </Link>
  )
}
