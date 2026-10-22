import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'

import { formatMoney } from '../../shared/lib/money'
import { queryKeys } from '../../shared/lib/query-keys'
import { ErrorState, LoadingState } from '../../shared/ui/ScreenState'
import { getOrderDetail } from './api/orders'
import type { OrderDetail } from './api/types'
import { OrderThreadActions } from './components/OrderThreadActions'

const steps = ['New', 'Called', 'Confirmed', 'Delivery', 'Paid'] as const

function currentStep(order: OrderDetail) {
  if (order.status === 'NEW' || order.status === 'UNREACHABLE') return 0
  if (order.status === 'CONTACTED') return 1
  if (order.status === 'CANCELLED') return 0
  if (order.delivery.status === 'NOT_SCHEDULED' || order.delivery.status === 'FAILED') return 2
  if (order.delivery.status === 'SCHEDULED' || order.delivery.status === 'DISPATCHED') return 3
  return 4
}

function ProgressPath({ order }: { order: OrderDetail }) {
  const active = currentStep(order)
  return (
    <ol aria-label="Order progress" className="m-0 grid grid-cols-5 p-0" role="list">
      {steps.map((step, index) => (
        <li className="relative grid justify-items-center gap-1" key={step}>
          {index > 0 && (
            <span
              aria-hidden="true"
              className={`absolute top-2.5 right-1/2 h-0.5 w-full ${index <= active ? 'bg-primary-mid' : 'bg-line'}`}
            />
          )}
          <span
            className={`relative z-10 grid size-5 place-items-center rounded-full border text-[10px] font-black ${
              index < active
                ? 'border-primary-mid bg-primary-mid text-on-primary'
                : index === active
                  ? 'border-gold bg-gold text-on-gold ring-4 ring-[var(--warn-tint)]'
                  : 'border-line bg-surface text-ink-2'
            }`}
          >
            {index < active ? '✓' : index + 1}
          </span>
          <span className={`text-[10px] font-bold ${index === active ? 'text-ink' : 'text-ink-2'}`}>
            {step}
          </span>
        </li>
      ))}
    </ol>
  )
}

function eventMessage(event: OrderDetail['timeline'][number]) {
  const actor = event.actorName ?? (event.actorUserId ? 'A team member' : 'Nouri')
  const messages: Record<string, string> = {
    ORDER_CREATED: `${actor} created the order`,
    PUBLIC_ORDER_CREATED: 'Customer submitted the order',
    CUSTOMER_CONTACTED: `${actor} called the customer`,
    CUSTOMER_UNREACHABLE: `${actor} could not reach the customer`,
    ORDER_CONFIRMED: `${actor} confirmed the order`,
    ORDER_CANCELLED: `${actor} cancelled the order`,
    ORDER_COMPLETED: `${actor} completed the order`,
    DELIVERY_SCHEDULED: `${actor} scheduled delivery`,
    DELIVERY_RESCHEDULED: `${actor} rescheduled delivery`,
    DELIVERY_RETRY_SCHEDULED: `${actor} scheduled a delivery retry`,
    ORDER_DISPATCHED: `${actor} dispatched the order`,
    ORDER_DELIVERED: `${actor} recorded a successful delivery`,
    DELIVERY_FAILED: `${actor} recorded a failed delivery`,
    PAYMENT_MARKED_PAID: `${actor} recorded payment`,
    PAYMENT_CONFIRMED: 'Payment was confirmed',
    PAYMENT_FAILED: 'Payment failed',
  }
  return messages[event.action] ?? `${actor} ${event.action.toLowerCase().replaceAll('_', ' ')}`
}

function TimelineEvent({ event }: { event: OrderDetail['timeline'][number] }) {
  const isNote = Boolean(event.note)
  const time = new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(event.createdAt))

  return (
    <li className={`flex ${isNote ? 'justify-end' : 'justify-start'}`}>
      <article
        className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm ${
          isNote
            ? 'rounded-br-md border border-dashed border-warn bg-[var(--note-bg)] text-[#4a3610]'
            : 'rounded-bl-md border border-line bg-surface text-ink shadow-[0_5px_20px_rgb(13_31_23/0.04)]'
        }`}
      >
        <p className="m-0 leading-relaxed">{event.note ?? eventMessage(event)}</p>
        <p className="mt-1.5 mb-0 text-[10px] font-semibold text-ink-2">
          {isNote && `${event.actorName ?? 'Team'} · `}
          {time}
        </p>
      </article>
    </li>
  )
}

export function OrderDetailPage() {
  const { orderId = '' } = useParams()
  const detailQuery = useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => getOrderDetail(orderId),
    enabled: Boolean(orderId),
  })

  if (detailQuery.isPending) return <LoadingState>Loading order...</LoadingState>
  if (detailQuery.isError || !detailQuery.data)
    return <ErrorState>This order could not be loaded.</ErrorState>

  const order = detailQuery.data
  const customerName = `${order.customer.firstName} ${order.customer.lastName ?? ''}`.trim()

  return (
    <section className="mx-auto grid h-full min-h-0 w-full max-w-[860px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[22px] border border-line bg-background shadow-[0_18px_60px_rgb(13_31_23/0.08)]">
      <header className="z-10 border-b border-line bg-surface px-4 pt-3 pb-4 sm:px-6">
        <div className="mb-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <Link
            aria-label="Back to orders"
            className="grid size-9 place-items-center rounded-full bg-surface-2 text-xl text-ink no-underline"
            to="/orders"
          >
            ‹
          </Link>
          <div className="min-w-0 text-center">
            <h1 className="m-0 truncate font-display text-[length:var(--display-sm)] font-bold text-ink">
              {customerName}
            </h1>
            <p className="m-0 truncate text-[length:var(--text-xs)] text-ink-2">
              {order.orderNumber} · {formatMoney(order.totalAmount, order.currency)}
            </p>
          </div>
          <span className="rounded-full bg-surface-2 px-2 py-1 text-[10px] font-black text-ink-2">
            {order.payment.method}
          </span>
        </div>
        <ProgressPath order={order} />
      </header>

      <div className="min-h-0 overflow-y-auto px-4 py-5 sm:px-6" aria-label="Order activity thread">
        {order.possibleDuplicate && (
          <div className="mb-4 rounded-2xl border border-warn bg-[var(--warn-tint)] p-3 text-sm font-semibold text-warn">
            This may duplicate another active order from the same customer.
          </div>
        )}

        <article className="mb-5 rounded-2xl bg-primary p-4 text-on-primary">
          <p className="m-0 text-[10px] font-bold tracking-[0.12em] text-gold uppercase">
            Order summary
          </p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <strong className="font-display text-lg">{order.offer.name}</strong>
              <p className="mt-1 mb-0 text-xs opacity-75">
                {order.delivery.area}, {order.delivery.state} · {order.payment.method}
              </p>
            </div>
            <strong className="font-display text-lg">
              {formatMoney(order.totalAmount, order.currency)}
            </strong>
          </div>
        </article>

        {order.customerNote && (
          <div className="mb-4 max-w-[86%] rounded-2xl rounded-bl-md border border-line bg-surface p-4 text-sm">
            <p className="m-0 leading-relaxed">“{order.customerNote}”</p>
            <p className="mt-1.5 mb-0 text-[10px] font-semibold text-ink-2">Customer note</p>
          </div>
        )}

        <ol className="m-0 grid list-none gap-3 p-0">
          {order.timeline.map((event) => (
            <TimelineEvent event={event} key={event.id} />
          ))}
        </ol>

        {order.timeline.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-2">No activity has been recorded yet.</p>
        )}
      </div>

      <OrderThreadActions order={order} />
    </section>
  )
}
