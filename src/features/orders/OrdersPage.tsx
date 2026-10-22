import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { queryKeys } from '../../shared/lib/query-keys'
import { getPositiveIntegerSearchParam, updateSearchParams } from '../../shared/lib/search-params'
import { FilterChips, type FilterChip } from '../../shared/ui/FilterChips'
import { listOrders } from './api/orders'
import type { OrderFilters, OrderQueueFilter } from './api/types'
import { OrderRow } from './components/OrderRow'

const queueFilters = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'follow-up', label: 'Follow up' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'failed', label: 'Failed' },
  { value: 'done', label: 'Done' },
] as const satisfies readonly FilterChip<OrderQueueFilter>[]

const queueValues = queueFilters.map((filter) => filter.value)

const initialFilters: OrderFilters = {
  search: '',
  queue: '',
  status: '',
  source: '',
  paymentMethod: '',
  from: '',
  to: '',
  page: 1,
  pageSize: 20,
}

function isQueueFilter(value: string | null): value is OrderQueueFilter {
  return value !== null && queueValues.includes(value as OrderQueueFilter)
}

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo<OrderFilters>(() => {
    const queue = searchParams.get('queue')
    return {
      ...initialFilters,
      search: searchParams.get('q') ?? '',
      queue: isQueueFilter(queue) ? queue : '',
      page: getPositiveIntegerSearchParam(searchParams, 'page'),
    }
  }, [searchParams])

  const ordersQuery = useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => listOrders(filters),
  })
  const total = ordersQuery.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / filters.pageSize))

  function setFilter(updates: Record<string, string | null>) {
    setSearchParams(updateSearchParams(searchParams, updates))
  }

  return (
    <section className="mx-auto grid w-full max-w-[860px] gap-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[length:var(--text-xs)] font-bold tracking-[0.14em] text-gold uppercase">
            Operations queue
          </p>
          <h1 className="m-0 font-display text-[length:var(--display-lg)] font-black tracking-[-0.03em] text-ink">
            Orders
          </h1>
          <p className="mt-1 mb-0 text-[length:var(--text-sm)] text-ink-2">
            {ordersQuery.isPending ? 'Loading your queue…' : `${total} orders in this view`}
          </p>
        </div>
        <Link
          aria-label="Create manual order"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-gold text-2xl leading-none font-medium text-on-gold no-underline shadow-[0_8px_24px_rgb(215_155_45/0.24)] transition-transform hover:scale-105"
          to="/orders/new"
        >
          +
        </Link>
      </header>

      <form
        className="relative"
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          const formData = new FormData(event.currentTarget)
          const value = formData.get('search')
          setFilter({ q: typeof value === 'string' ? value.trim() : '', page: null })
        }}
      >
        <label className="sr-only" htmlFor="order-search">
          Search orders
        </label>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-2"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2"
          />
        </svg>
        <input
          className="h-12 w-full rounded-2xl border border-line bg-surface pr-20 pl-12 text-[length:var(--text-base)] text-ink shadow-[0_8px_30px_rgb(13_31_23/0.04)] outline-none placeholder:text-ink-2 focus:border-primary-mid focus:ring-3 focus:ring-[var(--tint)]"
          defaultValue={filters.search}
          id="order-search"
          key={filters.search}
          name="search"
          placeholder="Search name, phone or order number"
          type="search"
        />
        <button
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-xl bg-primary px-3 py-2 text-[length:var(--text-xs)] font-bold text-on-primary"
          type="submit"
        >
          Search
        </button>
      </form>

      <FilterChips
        items={queueFilters}
        label="Order status filters"
        value={filters.queue}
        onChange={(queue) => setFilter({ queue, page: null })}
      />

      {ordersQuery.isPending && (
        <div className="grid gap-3" aria-label="Loading orders" role="status">
          {[0, 1, 2].map((item) => (
            <div
              className="h-[94px] animate-pulse rounded-[18px] border border-line bg-surface"
              key={item}
            />
          ))}
        </div>
      )}

      {ordersQuery.isError && (
        <div
          className="rounded-2xl border border-crit bg-[var(--crit-tint)] p-4 text-sm text-crit"
          role="alert"
        >
          We could not load the order queue. Try again.
        </div>
      )}

      {ordersQuery.data?.orders.length === 0 && (
        <div className="grid min-h-52 place-content-center justify-items-center rounded-[20px] border border-dashed border-line bg-surface p-8 text-center">
          <span className="mb-3 text-3xl" aria-hidden="true">
            ◌
          </span>
          <strong className="font-display text-[length:var(--display-sm)]">No orders found</strong>
          <span className="mt-1 text-[length:var(--text-sm)] text-ink-2">
            Try another search or queue filter.
          </span>
        </div>
      )}

      {ordersQuery.data && ordersQuery.data.orders.length > 0 && (
        <motion.div className="grid gap-2.5" layout>
          {ordersQuery.data.orders.map((order) => (
            <OrderRow key={order.order_id} order={order} />
          ))}
        </motion.div>
      )}

      {total > filters.pageSize && (
        <nav
          aria-label="Order pages"
          className="flex items-center justify-between gap-3 pt-2 text-[length:var(--text-sm)] text-ink-2"
        >
          <button
            className="rounded-full border border-line bg-surface px-4 py-2 font-bold text-ink disabled:opacity-40"
            disabled={filters.page <= 1}
            type="button"
            onClick={() => setFilter({ page: String(filters.page - 1) })}
          >
            Previous
          </button>
          <span>
            {filters.page} / {pages}
          </span>
          <button
            className="rounded-full border border-line bg-surface px-4 py-2 font-bold text-ink disabled:opacity-40"
            disabled={filters.page >= pages}
            type="button"
            onClick={() => setFilter({ page: String(filters.page + 1) })}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  )
}
