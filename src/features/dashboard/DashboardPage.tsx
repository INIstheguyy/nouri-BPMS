import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { queryKeys } from '../../shared/lib/query-keys'
import { SlaRing } from '../../shared/ui/SlaRing'
import { useAuth } from '../auth/useAuth'
import { listOrders } from '../orders/api/orders'
import type { OrderFilters, OrderQueueFilter } from '../orders/api/types'
import type { OrderTone } from '../orders/hooks/useOrderInfo'
import { Rail } from './components/Rail'
import { useLiveFeed } from './hooks/useLiveFeed'

function queueFilters(queue: OrderQueueFilter): OrderFilters {
  return {
    search: '',
    queue,
    status: '',
    source: '',
    paymentMethod: '',
    from: '',
    to: '',
    page: 1,
    pageSize: 20,
  }
}

function ageMinutes(createdAt: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000))
}

function toneForAge(age: number): OrderTone {
  return age > 30 ? 'crit' : age > 15 ? 'warn' : 'ok'
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function feedMessage(action: string, actorName: string | null, note: string | null) {
  if (note) return `${actorName ?? 'A teammate'} added a note`
  const actor = actorName ?? 'Nouri'
  const messages: Record<string, string> = {
    ORDER_CREATED: `${actor} created an order`,
    PUBLIC_ORDER_CREATED: 'A customer placed a new order',
    CUSTOMER_CONTACTED: `${actor} reached a customer`,
    CUSTOMER_UNREACHABLE: `${actor} could not reach a customer`,
    ORDER_CONFIRMED: `${actor} confirmed an order`,
    ORDER_CANCELLED: `${actor} cancelled an order`,
    DELIVERY_SCHEDULED: `${actor} scheduled a delivery`,
    DELIVERY_RESCHEDULED: `${actor} rescheduled a delivery`,
    DELIVERY_RETRY_SCHEDULED: `${actor} scheduled a retry`,
    ORDER_DISPATCHED: `${actor} dispatched an order`,
    ORDER_DELIVERED: `${actor} completed a delivery`,
    DELIVERY_FAILED: `${actor} recorded a failed delivery`,
    PAYMENT_MARKED_PAID: `${actor} recorded a payment`,
    ORDER_COMPLETED: `${actor} completed an order`,
  }
  return messages[action] ?? `${actor} updated an order`
}

function relativeTime(createdAt: string) {
  const minutes = ageMinutes(createdAt)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h ago`
  return `${Math.floor(minutes / 1_440)}d ago`
}

export function DashboardPage() {
  const auth = useAuth()
  const canReadOrders = auth.hasPermission('order.read')
  const canReadDashboard = auth.hasPermission('dashboard.operations.read')
  const firstName = auth.access?.fullName.split(/\s+/)[0] ?? 'there'
  const newFilters = queueFilters('new')
  const followUpFilters = queueFilters('follow-up')
  const deliveryFilters = queueFilters('delivery')
  const failedFilters = queueFilters('failed')
  const newOrders = useQuery({
    queryKey: queryKeys.orders.list(newFilters),
    queryFn: () => listOrders(newFilters),
    enabled: canReadOrders,
  })
  const followUps = useQuery({
    queryKey: queryKeys.orders.list(followUpFilters),
    queryFn: () => listOrders(followUpFilters),
    enabled: canReadOrders,
  })
  const deliveries = useQuery({
    queryKey: queryKeys.orders.list(deliveryFilters),
    queryFn: () => listOrders(deliveryFilters),
    enabled: canReadOrders,
  })
  const failures = useQuery({
    queryKey: queryKeys.orders.list(failedFilters),
    queryFn: () => listOrders(failedFilters),
    enabled: canReadOrders,
  })
  const feed = useLiveFeed(canReadDashboard)
  const oldestNew = [...(newOrders.data?.orders ?? [])].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  )[0]
  const oldestAge = oldestNew ? ageMinutes(oldestNew.created_at) : 0
  const heroTone = toneForAge(oldestAge)
  const isPending =
    newOrders.isPending || followUps.isPending || deliveries.isPending || failures.isPending
  const isError = newOrders.isError || followUps.isError || deliveries.isError || failures.isError

  return (
    <section className="mx-auto grid w-full max-w-[980px] gap-7 pb-4">
      <header>
        <p className="mb-1 text-xs font-bold tracking-[0.14em] text-gold uppercase">Today’s work</p>
        <h1 className="m-0 font-display text-[length:var(--display-lg)] font-black tracking-[-0.03em] text-ink">
          {greeting()}, {firstName}
        </h1>
        <p className="mt-1 mb-0 text-sm text-ink-2">Here’s what needs your attention right now.</p>
      </header>

      {isPending && (
        <div className="grid gap-4" aria-label="Loading home" role="status">
          <div className="h-56 animate-pulse rounded-[26px] bg-primary/80" />
          <div className="h-44 animate-pulse rounded-[20px] bg-surface" />
        </div>
      )}

      {isError && (
        <div
          className="rounded-2xl border border-crit bg-[var(--crit-tint)] p-4 text-sm font-bold text-crit"
          role="alert"
        >
          Today’s queues could not be loaded. Refresh and try again.
        </div>
      )}

      {!isPending && !isError && (
        <>
          <section className="relative overflow-hidden rounded-[26px] bg-primary p-5 text-on-primary shadow-[0_20px_55px_rgb(26_61_43/0.22)] sm:p-7">
            <div className="absolute -top-24 -right-16 size-64 rounded-full bg-white/5" />
            {oldestNew ? (
              <div className="relative grid grid-cols-[1fr_auto] items-center gap-5">
                <div>
                  <p className="m-0 text-xs font-bold tracking-[0.12em] text-gold uppercase">
                    Waiting for a call
                  </p>
                  <p className="mt-2 mb-0 font-display text-[length:var(--display-xl)] leading-none font-black">
                    {newOrders.data?.total ?? 0}
                  </p>
                  <p className="mt-1 mb-4 text-sm text-white/70">
                    {(newOrders.data?.total ?? 0) === 1 ? 'new order needs' : 'new orders need'}{' '}
                    attention
                  </p>
                  <Link
                    className="inline-flex rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-[#173524] no-underline"
                    to={`/orders/${oldestNew.order_id}`}
                  >
                    Call {oldestNew.customer_name.split(/\s+/)[0]}
                  </Link>
                </div>
                <div className="relative grid size-28 place-items-center sm:size-36">
                  <SlaRing
                    label={`${oldestAge} minutes of the 30 minute call SLA`}
                    pct={oldestAge / 30}
                    pulse={heroTone === 'crit'}
                    size={144}
                    tone={heroTone}
                  />
                  <span className="absolute grid justify-items-center">
                    <strong className="font-display text-2xl leading-none">{oldestAge}</strong>
                    <small className="mt-1 text-[10px] font-bold text-white/60 uppercase">
                      minutes
                    </small>
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative py-7 text-center">
                <span className="text-3xl" aria-hidden="true">
                  ✓
                </span>
                <h2 className="mt-3 mb-1 font-display text-2xl font-bold">All caught up</h2>
                <p className="m-0 text-sm text-white/65">
                  No new orders are waiting for a first call.
                </p>
              </div>
            )}
          </section>

          <Rail
            title="Follow up"
            empty="No customers need a follow-up."
            orders={followUps.data?.orders ?? []}
            queue="follow-up"
          />
          <Rail
            title="Delivery desk"
            empty="No deliveries need attention."
            orders={deliveries.data?.orders ?? []}
            queue="delivery"
          />
          <Rail
            title="Needs a retry"
            empty="No failed deliveries need a retry."
            orders={failures.data?.orders ?? []}
            queue="failed"
          />

          <section className="grid gap-3 border-t border-line pt-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="m-0 font-display text-[length:var(--display-sm)] font-bold text-ink">
                Just happened
              </h2>
              {feed.isFetching && (
                <span className="text-[10px] font-bold text-ink-2">Updating…</span>
              )}
            </div>
            {feed.data && feed.data.length > 0 ? (
              <ol className="m-0 grid list-none gap-1 p-0">
                {feed.data.slice(0, 8).map((item) => (
                  <li key={item.event_id}>
                    <Link
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2 py-2.5 text-ink no-underline hover:bg-surface"
                      to={`/orders/${item.order_id}`}
                    >
                      <span className="size-2 rounded-full bg-primary-mid ring-4 ring-[var(--tint)]" />
                      <span className="min-w-0 truncate text-sm">
                        {feedMessage(item.action, item.actor_name, item.note)}
                        <strong className="ml-1 text-xs text-ink-2">{item.order_number}</strong>
                      </span>
                      <time
                        className="text-[10px] font-semibold text-ink-2"
                        dateTime={item.created_at}
                      >
                        {relativeTime(item.created_at)}
                      </time>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="m-0 rounded-2xl bg-surface p-5 text-center text-sm text-ink-2">
                No recent activity yet.
              </p>
            )}
          </section>
        </>
      )}
    </section>
  )
}
