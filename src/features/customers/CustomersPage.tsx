import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'

import { formatMoney } from '../../shared/lib/money'
import { phoneHref } from '../../shared/lib/phone'
import { queryKeys } from '../../shared/lib/query-keys'
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/ScreenState'
import { listOrders } from '../orders/api/orders'
import type { OrderFilters } from '../orders/api/types'
import { OrderRow } from '../orders/components/OrderRow'
import { useCustomers, type CustomerSummary } from './hooks/useCustomers'

const allOrdersFilter: OrderFilters = {
  search: '',
  queue: '',
  status: '',
  source: '',
  paymentMethod: '',
  from: '',
  to: '',
  page: 1,
  pageSize: 100,
}

async function listAllOrders() {
  const firstPage = await listOrders(allOrdersFilter)
  const orders = [...firstPage.orders]
  let page = 2

  while (orders.length < firstPage.total) {
    const nextPage = await listOrders({ ...allOrdersFilter, page })
    if (nextPage.orders.length === 0) break
    orders.push(...nextPage.orders)
    page += 1
  }

  return orders
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function CustomerRow({ customer, onSelect }: { customer: CustomerSummary; onSelect: () => void }) {
  const repeat = customer.orders.length > 1
  return (
    <motion.article
      layout
      className="overflow-hidden rounded-[18px] border border-line bg-surface shadow-[0_8px_30px_rgb(13_31_23/0.04)]"
    >
      <button
        aria-label={`Open ${customer.name}`}
        className="grid min-h-[92px] w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-0 bg-transparent p-3.5 text-left text-ink sm:gap-4 sm:px-5"
        onClick={onSelect}
        type="button"
      >
        <span className="grid size-11 place-items-center rounded-full bg-[var(--tint)] font-display text-sm font-black text-[var(--viz)] ring-2 ring-[var(--viz)] ring-offset-2 ring-offset-surface">
          {initials(customer.name)}
        </span>
        <span className="min-w-0">
          <strong className="block truncate font-display text-[length:var(--text-md)] font-bold">
            {customer.name}
          </strong>
          <span className="mt-0.5 block truncate text-[length:var(--text-xs)] text-ink-2">
            {customer.phone} · {customer.area}
          </span>
          <span className="mt-2 block text-[length:var(--text-sm)] font-bold text-ink-2">
            {customer.orders.length} {customer.orders.length === 1 ? 'order' : 'orders'} ·{' '}
            {formatMoney(customer.totalSpend, customer.currency)}
          </span>
        </span>
        <span className="grid justify-items-end gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[length:var(--text-xs)] font-black ${repeat ? 'bg-[var(--ok-tint)] text-ok' : 'bg-surface-2 text-ink-2'}`}
          >
            {repeat ? 'Repeat' : 'New'}
          </span>
          <span aria-hidden="true" className="text-xl text-ink-2">
            ›
          </span>
        </span>
      </button>
    </motion.article>
  )
}

function CustomerDetail({ customer, onBack }: { customer: CustomerSummary; onBack: () => void }) {
  const whatsapp = phoneHref(customer.phone, 'whatsapp')
  return (
    <motion.section
      key="detail"
      animate={{ opacity: 1, x: 0 }}
      className="people-detail"
      exit={{ opacity: 0, x: '25%' }}
      initial={{ opacity: 0, x: '100%' }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <button aria-label="Back to people" className="people-back" onClick={onBack} type="button">
        ← Back to people
      </button>
      <header className="people-profile">
        <span className="people-avatar">{initials(customer.name)}</span>
        <div>
          <p className="eyebrow">Customer profile</p>
          <h1>{customer.name}</h1>
          <p>
            {customer.area} · {customer.phone}
          </p>
        </div>
        <div className="people-contact-actions">
          <a href={phoneHref(customer.phone, 'tel')}>Call</a>
          <a href={whatsapp} rel="noreferrer" target="_blank">
            WhatsApp
          </a>
        </div>
      </header>
      <article className="people-spend-card">
        <span>Total spend</span>
        <strong>{formatMoney(customer.totalSpend, customer.currency)}</strong>
        <small>
          {customer.orders.length} {customer.orders.length === 1 ? 'order' : 'orders'} on record
        </small>
      </article>
      <section className="people-history" aria-labelledby="order-history-title">
        <div>
          <p className="eyebrow">Order history</p>
          <h2 id="order-history-title">Every order</h2>
        </div>
        <div className="grid gap-3">
          {customer.orders.map((order) => (
            <OrderRow key={order.order_id} order={order} />
          ))}
        </div>
      </section>
    </motion.section>
  )
}

export function CustomersPage() {
  const [search, setSearch] = useState('')
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const ordersQuery = useQuery({
    queryKey: queryKeys.customers.all(),
    queryFn: listAllOrders,
  })
  const customers = useCustomers(ordersQuery.data ?? [])
  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return customers
    return customers.filter(
      (customer) =>
        customer.name.toLocaleLowerCase().includes(query) || customer.phone.includes(query),
    )
  }, [customers, search])
  const selected = customers.find((customer) => customer.phone === selectedPhone)

  if (ordersQuery.isPending) return <LoadingState>Loading people...</LoadingState>
  if (ordersQuery.isError) return <ErrorState>People could not be loaded.</ErrorState>

  return (
    <AnimatePresence mode="wait" initial={false}>
      {selected ? (
        <CustomerDetail customer={selected} onBack={() => setSelectedPhone(null)} />
      ) : (
        <motion.section
          key="list"
          animate={{ opacity: 1, x: 0 }}
          className="people-page"
          exit={{ opacity: 0, x: '-20%' }}
          initial={{ opacity: 0, x: '-10%' }}
        >
          <header className="people-heading">
            <div>
              <p className="eyebrow">Relationships</p>
              <h1>People</h1>
              <p>{customers.length} customers, built from their order history.</p>
            </div>
            <label className="people-search">
              <span className="sr-only">Search people</span>
              <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                <path
                  d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                />
              </svg>
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or phone"
                type="search"
                value={search}
              />
            </label>
          </header>
          {filteredCustomers.length === 0 ? (
            <EmptyState>No people match this search.</EmptyState>
          ) : (
            <div className="grid gap-3">
              {filteredCustomers.map((customer) => (
                <CustomerRow
                  key={customer.phone}
                  customer={customer}
                  onSelect={() => setSelectedPhone(customer.phone)}
                />
              ))}
            </div>
          )}
        </motion.section>
      )}
    </AnimatePresence>
  )
}
