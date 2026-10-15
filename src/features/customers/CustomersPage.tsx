import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { listCustomers, type CustomerFilters } from './api'
import { formatMoney } from '../orders/api'

const initialFilters: CustomerFilters = { search: '', page: 1, pageSize: 20 }

export function CustomersPage() {
  const [filters, setFilters] = useState(initialFilters)
  const [draftSearch, setDraftSearch] = useState('')
  const customersQuery = useQuery({
    queryKey: ['customers', filters],
    queryFn: () => listCustomers(filters),
  })
  const pages = Math.max(1, Math.ceil((customersQuery.data?.total ?? 0) / filters.pageSize))

  return (
    <section className="customers-page">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Customer history</p>
          <h1>Customers</h1>
          <p>Find customers, review repeat orders, and see fulfilled and paid value.</p>
        </div>
      </div>

      <form
        className="customer-filters"
        onSubmit={(event) => {
          event.preventDefault()
          setFilters((current) => ({ ...current, search: draftSearch.trim(), page: 1 }))
        }}
      >
        <label>
          <span>Search by name or phone</span>
          <input
            value={draftSearch}
            placeholder="Customer name or phone"
            onChange={(event) => setDraftSearch(event.target.value)}
          />
        </label>
        <button className="secondary-action" type="submit">
          Search
        </button>
      </form>

      {customersQuery.isPending && <div className="workspace-state">Loading customers...</div>}
      {customersQuery.isError && (
        <div className="form-error">We could not load customers. Try again.</div>
      )}
      {customersQuery.data?.customers.length === 0 && (
        <div className="workspace-state">No customers match this search.</div>
      )}

      {customersQuery.data && customersQuery.data.customers.length > 0 && (
        <div className="orders-table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Location</th>
                <th>Orders</th>
                <th>Delivered</th>
                <th>Last order</th>
                <th>Paid spend</th>
              </tr>
            </thead>
            <tbody>
              {customersQuery.data.customers.map((customer) => (
                <tr key={customer.customer_id}>
                  <td>
                    <Link to={`/customers/${customer.customer_id}`}>{customer.customer_name}</Link>
                    <small>{customer.primary_phone}</small>
                  </td>
                  <td>
                    {customer.area ?? 'Not provided'}
                    <small>
                      {[customer.city, customer.state].filter(Boolean).join(', ') || 'No location'}
                    </small>
                  </td>
                  <td>{customer.total_orders}</td>
                  <td>{customer.delivered_orders}</td>
                  <td>
                    {customer.last_order_status ?? 'No orders'}
                    <small>
                      {customer.last_order_date
                        ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(
                            new Date(customer.last_order_date),
                          )
                        : 'Never'}
                    </small>
                  </td>
                  <td>{formatMoney(customer.total_paid_spend, customer.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="pagination" aria-label="Customer pages">
        <button
          type="button"
          disabled={filters.page <= 1}
          onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}
        >
          Previous
        </button>
        <span>
          Page {filters.page} of {pages} · {customersQuery.data?.total ?? 0} customers
        </span>
        <button
          type="button"
          disabled={filters.page >= pages}
          onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
        >
          Next
        </button>
      </div>
    </section>
  )
}
