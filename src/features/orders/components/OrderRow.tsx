import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

import { formatMoney } from '../../../shared/lib/money'
import type { OrderSummary } from '../api/types'
import { useOrderInfo, type OrderInfoIcon, type OrderTone } from '../hooks/useOrderInfo'

const toneClasses: Record<OrderTone, { row: string; avatar: string; badge: string }> = {
  crit: {
    row: 'border-l-crit',
    avatar: 'ring-crit bg-[var(--crit-tint)] text-crit',
    badge: 'bg-[var(--crit-tint)] text-crit',
  },
  warn: {
    row: 'border-l-warn',
    avatar: 'ring-warn bg-[var(--warn-tint)] text-warn',
    badge: 'bg-[var(--warn-tint)] text-warn',
  },
  ok: {
    row: 'border-l-ok',
    avatar: 'ring-ok bg-[var(--ok-tint)] text-ok',
    badge: 'bg-[var(--ok-tint)] text-ok',
  },
  neutral: {
    row: 'border-l-ink-2',
    avatar: 'ring-ink-2 bg-surface-2 text-ink-2',
    badge: 'bg-surface-2 text-ink-2',
  },
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function StatusIcon({ name }: { name: OrderInfoIcon }) {
  const pathByName: Record<OrderInfoIcon, string> = {
    clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    phone:
      'M7 3H4a1 1 0 0 0-1 1c0 9.39 7.61 17 17 17a1 1 0 0 0 1-1v-3l-4-1-2 2c-4-1-8-5-9-9l2-2-1-4Z',
    truck:
      'M3 6h11v11H3zM14 10h4l3 3v4h-7zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
    alert:
      'M12 8v5m0 3h.01M10.3 3.7 2.4 18a2 2 0 0 0 1.75 3h15.7a2 2 0 0 0 1.75-3L13.7 3.7a2 2 0 0 0-3.4 0Z',
    check: 'm5 12 4 4L19 6',
    close: 'm6 6 12 12M18 6 6 18',
  }

  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path
        d={pathByName[name]}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

export function OrderRow({ order }: { order: OrderSummary }) {
  const info = useOrderInfo(order)
  const tone = toneClasses[info.tone]

  return (
    <motion.article
      layout
      className={`overflow-hidden rounded-[18px] border border-l-4 border-line bg-surface shadow-[0_8px_30px_rgb(13_31_23/0.04)] ${tone.row}`}
    >
      <Link
        aria-label={order.order_number}
        className="grid min-h-[92px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3.5 text-ink no-underline sm:gap-4 sm:px-5"
        to={`/orders/${order.order_id}`}
      >
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-full font-display text-sm font-bold ring-2 ring-offset-2 ring-offset-surface ${tone.avatar}`}
        >
          {initials(order.customer_name)}
        </span>

        <span className="min-w-0">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <strong className="truncate font-display text-[length:var(--text-md)] font-bold">
              {order.customer_name}
            </strong>
            {order.possible_duplicate && (
              <span className="rounded-full bg-[var(--warn-tint)] px-2 py-0.5 text-[length:var(--text-xs)] font-bold text-warn">
                Possible duplicate
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-[length:var(--text-xs)] text-ink-2">
            {order.order_number} · {info.line}
          </span>
          <span className="mt-2 flex min-w-0 items-center gap-2">
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[length:var(--text-xs)] font-bold ${tone.badge}`}
            >
              <StatusIcon name={info.icon} />
              {info.badge}
            </span>
            <span className="truncate text-[length:var(--text-sm)] text-ink-2">{info.row}</span>
          </span>
        </span>

        <span className="grid justify-items-end gap-2 pl-1">
          <strong className="font-display text-[length:var(--text-md)] font-bold tabular-nums">
            {formatMoney(order.total_amount, order.currency)}
          </strong>
          <span className="rounded-full bg-surface-2 px-2 py-1 text-[length:var(--text-xs)] font-bold text-ink-2">
            {order.payment_method}
          </span>
          <span aria-hidden="true" className="text-lg leading-none text-ink-2">
            ›
          </span>
        </span>
      </Link>
    </motion.article>
  )
}
