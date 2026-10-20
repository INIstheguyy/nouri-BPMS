import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { formatMoney } from '../../shared/lib/money'
import { queryKeys } from '../../shared/lib/query-keys'
import { getPositiveIntegerSearchParam, updateSearchParams } from '../../shared/lib/search-params'
import { useIsMobileView } from '../../shared/hooks/useIsMobileView'
import { ResponsiveDataList } from '../../shared/ui/ResponsiveDataList'
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/ScreenState'
import { PageHeader } from '../../shared/ui/PageHeader'
import { listCustomers, type CustomerFilters } from './api'

const initialFilters: CustomerFilters = { search: '', page: 1, pageSize: 20 }

export function CustomersPage() {
  const isMobile = useIsMobileView()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo<CustomerFilters>(() => {
    return {
      ...initialFilters,
      search: searchParams.get('q') ?? '',
      page: getPositiveIntegerSearchParam(searchParams, 'page'),
    }
  }, [searchParams])
  const customersQuery = useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: () => listCustomers(filters),
  })
  const pages = Math.max(1, Math.ceil((customersQuery.data?.total ?? 0) / filters.pageSize))

  return (
    <section className="customers-page">
      <PageHeader
        eyebrow="Customer history"
        title="Customers"
        description="Find customers, review repeat orders, and see fulfilled and paid value."
      />

      <form
        className="customer-filters"
        onSubmit={(event) => {
          event.preventDefault()
          const formData = new FormData(event.currentTarget)
          const searchValue = formData.get('search')
          const search = typeof searchValue === 'string' ? searchValue.trim() : ''
          setSearchParams(updateSearchParams(searchParams, { q: search, page: null }))
        }}
      >
        <label>
          <span>Search by name or phone</span>
          <input
            key={filters.search}
            defaultValue={filters.search}
            name="search"
            placeholder="Customer name or phone"
          />
        </label>
        <button className="secondary-action" type="submit">
          Search
        </button>
      </form>

      {customersQuery.isPending && <LoadingState>Loading customers...</LoadingState>}
      {customersQuery.isError && <ErrorState>We could not load customers. Try again.</ErrorState>}
      {customersQuery.data?.customers.length === 0 && (
        <EmptyState>No customers match this search.</EmptyState>
      )}

      {customersQuery.data && customersQuery.data.customers.length > 0 && (
        <>
          <div className="orders-table-wrap" hidden={isMobile}>
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
                      <Link to={`/customers/${customer.customer_id}`}>
                        {customer.customer_name}
                      </Link>
                      <small>{customer.primary_phone}</small>
                    </td>
                    <td>
                      {customer.area ?? 'Not provided'}
                      <small>
                        {[customer.city, customer.state].filter(Boolean).join(', ') ||
                          'No location'}
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
          {isMobile && (
            <ResponsiveDataList
              ariaLabel="Customers"
              items={customersQuery.data.customers.map((customer) => ({
                id: customer.customer_id,
                title: (
                  <Link to={`/customers/${customer.customer_id}`}>{customer.customer_name}</Link>
                ),
                description: customer.primary_phone,
                fields: [
                  {
                    label: 'Location',
                    value:
                      [customer.area, customer.city, customer.state].filter(Boolean).join(', ') ||
                      'No location',
                  },
                  { label: 'Orders', value: customer.total_orders },
                  { label: 'Delivered', value: customer.delivered_orders },
                  {
                    label: 'Last order',
                    value: customer.last_order_date
                      ? `${customer.last_order_status ?? 'Order'} · ${new Intl.DateTimeFormat(
                          'en-NG',
                          {
                            dateStyle: 'medium',
                          },
                        ).format(new Date(customer.last_order_date))}`
                      : 'Never',
                  },
                  {
                    label: 'Paid spend',
                    value: formatMoney(customer.total_paid_spend, customer.currency),
                  },
                ],
              }))}
            />
          )}
        </>
      )}

      <div className="pagination" aria-label="Customer pages">
        <button
          type="button"
          disabled={filters.page <= 1}
          onClick={() => {
            setSearchParams(updateSearchParams(searchParams, { page: String(filters.page - 1) }))
          }}
        >
          Previous
        </button>
        <span>
          Page {filters.page} of {pages} · {customersQuery.data?.total ?? 0} customers
        </span>
        <button
          type="button"
          disabled={filters.page >= pages}
          onClick={() => {
            setSearchParams(updateSearchParams(searchParams, { page: String(filters.page + 1) }))
          }}
        >
          Next
        </button>
      </div>
    </section>
  )
}
