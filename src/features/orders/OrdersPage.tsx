import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { formatMoney, listDeliveryAttention, listOrders, type OrderFilters } from './api'

const statuses = [
  '',
  'NEW',
  'CONTACTED',
  'UNREACHABLE',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
] as const

const initialFilters: OrderFilters = {
  search: '',
  status: '',
  source: '',
  paymentMethod: '',
  from: '',
  to: '',
  page: 1,
  pageSize: 20,
}

export function OrdersPage() {
  const [filters, setFilters] = useState(initialFilters)
  const [draftSearch, setDraftSearch] = useState('')
  const ordersQuery = useQuery({
    queryKey: ['orders', filters],
    queryFn: () => listOrders(filters),
  })
  const queueDate = new Date().toISOString().slice(0, 10)
  const deliveryQuery = useQuery({
    queryKey: ['delivery-attention', queueDate],
    queryFn: () => listDeliveryAttention(queueDate),
  })
  const pages = Math.max(1, Math.ceil((ordersQuery.data?.total ?? 0) / filters.pageSize))
  const todayDeliveries =
    deliveryQuery.data?.filter((item) => item.delivery_status !== 'FAILED') ?? []
  const failedDeliveries =
    deliveryQuery.data?.filter((item) => item.delivery_status === 'FAILED') ?? []

  function updateFilter<K extends keyof OrderFilters>(key: K, value: OrderFilters[K]) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === 'page' ? Number(value) : 1,
    }))
  }

  return (
    <section className="orders-page">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Operations queue</p>
          <h1>Orders</h1>
          <p>Find incoming orders, customer details, delivery state, and payment status.</p>
        </div>
        <Link className="primary-action" to="/orders/new">
          Create manual order
        </Link>
      </div>

      <section className="delivery-attention" aria-label="Delivery attention queues">
        <article className="attention-column">
          <div>
            <p className="eyebrow">Today</p>
            <h2>Delivery queue</h2>
          </div>
          {deliveryQuery.isPending && <p>Loading delivery work...</p>}
          {deliveryQuery.isError && (
            <p className="form-error">Delivery work could not be loaded.</p>
          )}
          {!deliveryQuery.isPending && todayDeliveries.length === 0 && (
            <p>No deliveries are scheduled for today.</p>
          )}
          {todayDeliveries.map((item) => (
            <Link className="attention-item" key={item.order_id} to={`/orders/${item.order_id}`}>
              <span>
                <strong>{item.order_number}</strong>
                <small>
                  {item.customer_name} · {item.area}, {item.state}
                </small>
              </span>
              <b>{item.delivery_status.replaceAll('_', ' ')}</b>
            </Link>
          ))}
        </article>
        <article className="attention-column attention-failed">
          <div>
            <p className="eyebrow">Needs action</p>
            <h2>Failed deliveries</h2>
          </div>
          {!deliveryQuery.isPending && failedDeliveries.length === 0 && (
            <p>No failed deliveries require retry.</p>
          )}
          {failedDeliveries.map((item) => (
            <Link className="attention-item" key={item.order_id} to={`/orders/${item.order_id}`}>
              <span>
                <strong>{item.order_number}</strong>
                <small>
                  {item.customer_name} · {item.area}, {item.state}
                </small>
              </span>
              <b>{item.failure_reason_code?.replaceAll('_', ' ') ?? 'Review failure'}</b>
            </Link>
          ))}
        </article>
      </section>

      <div className="status-tabs" aria-label="Order status filters">
        {statuses.map((status) => (
          <button
            className={filters.status === status ? 'active' : ''}
            key={status || 'ALL'}
            type="button"
            onClick={() => updateFilter('status', status)}
          >
            {status || 'ALL'}
          </button>
        ))}
      </div>

      <form
        className="order-filters"
        onSubmit={(event) => {
          event.preventDefault()
          updateFilter('search', draftSearch.trim())
        }}
      >
        <label className="search-field">
          <span>Search</span>
          <input
            value={draftSearch}
            placeholder="Order number, customer, or phone"
            onChange={(event) => setDraftSearch(event.target.value)}
          />
        </label>
        <label>
          <span>Source</span>
          <select
            value={filters.source}
            onChange={(event) =>
              updateFilter('source', event.target.value as OrderFilters['source'])
            }
          >
            <option value="">All sources</option>
            {[
              'LANDING_PAGE',
              'WEBSITE',
              'WHATSAPP',
              'PHONE',
              'INSTAGRAM',
              'FACEBOOK',
              'TIKTOK',
              'AFFILIATE',
              'OTHER',
            ].map((source) => (
              <option key={source}>{source}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Payment</span>
          <select
            value={filters.paymentMethod}
            onChange={(event) =>
              updateFilter('paymentMethod', event.target.value as OrderFilters['paymentMethod'])
            }
          >
            <option value="">All methods</option>
            <option value="COD">COD</option>
            <option value="PREPAID">Prepaid</option>
          </select>
        </label>
        <label>
          <span>From</span>
          <input
            type="date"
            value={filters.from}
            onChange={(event) => updateFilter('from', event.target.value)}
          />
        </label>
        <label>
          <span>To</span>
          <input
            type="date"
            value={filters.to}
            onChange={(event) => updateFilter('to', event.target.value)}
          />
        </label>
        <button className="secondary-action" type="submit">
          Search
        </button>
      </form>

      {ordersQuery.isPending && <div className="workspace-state">Loading orders…</div>}
      {ordersQuery.isError && (
        <div className="form-error">We could not load the order queue. Try again.</div>
      )}
      {ordersQuery.data?.orders.length === 0 && (
        <div className="workspace-state">No orders match these filters.</div>
      )}

      {ordersQuery.data && ordersQuery.data.orders.length > 0 && (
        <div className="orders-table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Package</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {ordersQuery.data.orders.map((order) => (
                <tr key={order.order_id}>
                  <td>
                    <Link to={`/orders/${order.order_id}`}>{order.order_number}</Link>
                    {order.possible_duplicate && (
                      <small className="warning-label">Possible duplicate</small>
                    )}
                  </td>
                  <td>
                    <strong>{order.customer_name}</strong>
                    <small>{order.customer_phone}</small>
                  </td>
                  <td>
                    <span className={`status-chip status-${order.order_status.toLowerCase()}`}>
                      {order.order_status}
                    </span>
                    <small>{order.delivery_status.replaceAll('_', ' ')}</small>
                  </td>
                  <td>
                    {order.offer_name}
                    <small>{order.source.replaceAll('_', ' ')}</small>
                  </td>
                  <td>
                    {order.payment_method}
                    <small>{order.payment_status}</small>
                  </td>
                  <td>{formatMoney(order.total_amount, order.currency)}</td>
                  <td>
                    {new Intl.DateTimeFormat('en-NG', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(order.created_at))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="pagination" aria-label="Order pages">
        <button
          type="button"
          disabled={filters.page <= 1}
          onClick={() => updateFilter('page', filters.page - 1)}
        >
          Previous
        </button>
        <span>
          Page {filters.page} of {pages} · {ordersQuery.data?.total ?? 0} orders
        </span>
        <button
          type="button"
          disabled={filters.page >= pages}
          onClick={() => updateFilter('page', filters.page + 1)}
        >
          Next
        </button>
      </div>
    </section>
  )
}
