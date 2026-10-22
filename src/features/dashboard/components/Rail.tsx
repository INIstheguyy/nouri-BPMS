import { Link } from 'react-router-dom'

import type { OrderSummary } from '../../orders/api/types'
import { OrderTile } from '../../orders/components/OrderTile'

export function Rail({
  title,
  empty,
  orders,
  queue,
}: {
  title: string
  empty: string
  orders: OrderSummary[]
  queue: string
}) {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="m-0 font-display text-[length:var(--display-sm)] font-bold text-ink">
          {title}
        </h2>
        <Link
          className="text-xs font-bold text-primary-mid no-underline"
          to={`/orders?queue=${queue}`}
        >
          See all
        </Link>
      </div>
      {orders.length > 0 ? (
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&>*]:snap-start [&::-webkit-scrollbar]:hidden">
          {orders.map((order) => (
            <OrderTile key={order.order_id} order={order} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-4 py-6 text-center text-sm text-ink-2">
          {empty}
        </div>
      )}
    </section>
  )
}
