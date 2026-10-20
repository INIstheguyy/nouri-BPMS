import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'

import { getCustomerDetail } from './api'
import { formatMoney } from '../../shared/lib/money'
import { phoneHref } from '../../shared/lib/phone'
import { queryKeys } from '../../shared/lib/query-keys'
import { useIsMobileView } from '../../shared/hooks/useIsMobileView'
import { ResponsiveDataList } from '../../shared/ui/ResponsiveDataList'

export function CustomerDetailPage() {
  const isMobile = useIsMobileView()
  const { customerId = '' } = useParams()
  const customerQuery = useQuery({
    queryKey: queryKeys.customers.detail(customerId),
    queryFn: () => getCustomerDetail(customerId),
    enabled: Boolean(customerId),
  })

  if (customerQuery.isPending) return <div className="workspace-state">Loading customer...</div>
  if (customerQuery.isError || !customerQuery.data) {
    return <div className="form-error">This customer could not be loaded.</div>
  }

  const customer = customerQuery.data
  const name = `${customer.firstName} ${customer.lastName ?? ''}`.trim()
  const whatsapp = customer.whatsappPhone ?? customer.primaryPhone

  return (
    <section className="customer-detail-page">
      <Link className="text-link" to="/customers">
        {'<-'} Back to customers
      </Link>
      <div className="page-heading-row detail-heading">
        <div>
          <p className="eyebrow">Customer detail</p>
          <h1>{name}</h1>
          <p>
            Customer since {new Intl.DateTimeFormat('en-NG').format(new Date(customer.createdAt))}
          </p>
        </div>
        <div className="detail-actions">
          <a className="secondary-action" href={phoneHref(customer.primaryPhone, 'tel')}>
            Call customer
          </a>
          <a
            className="primary-action"
            href={phoneHref(whatsapp, 'whatsapp')}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
        </div>
      </div>

      <section className="customer-summary-grid" aria-label="Customer summary">
        <article className="summary-card">
          <span>Total orders</span>
          <strong>{customer.summary.totalOrders}</strong>
        </article>
        <article className="summary-card">
          <span>Delivered</span>
          <strong>{customer.summary.deliveredOrders}</strong>
        </article>
        <article className="summary-card">
          <span>Cancelled</span>
          <strong>{customer.summary.cancelledOrders}</strong>
        </article>
        <article className="summary-card">
          <span>Failed deliveries</span>
          <strong>{customer.summary.failedDeliveries}</strong>
        </article>
        <article className="summary-card paid-summary-card">
          <span>Total paid spend</span>
          <strong>{formatMoney(customer.summary.totalPaidSpend, customer.summary.currency)}</strong>
        </article>
      </section>

      <div className="detail-grid detail-grid-wide">
        <article className="workspace-card">
          <p className="eyebrow">Contact</p>
          <h2>{customer.primaryPhone}</h2>
          <dl>
            <dt>Email</dt>
            <dd>{customer.email ?? 'Not provided'}</dd>
            <dt>Alternative phone</dt>
            <dd>{customer.alternativePhone ?? 'Not provided'}</dd>
            <dt>WhatsApp</dt>
            <dd>{customer.whatsappPhone ?? customer.primaryPhone}</dd>
          </dl>
        </article>
        <article className="workspace-card">
          <p className="eyebrow">Location and acquisition</p>
          <h2>{customer.area ?? 'Location not provided'}</h2>
          <p>
            {[customer.defaultAddress, customer.city, customer.state].filter(Boolean).join(', ') ||
              'No default address available.'}
          </p>
          <dl>
            <dt>First source</dt>
            <dd>{customer.summary.firstAcquisitionSource?.replaceAll('_', ' ') ?? 'Unknown'}</dd>
            <dt>Most recent source</dt>
            <dd>
              {customer.summary.mostRecentAcquisitionSource?.replaceAll('_', ' ') ?? 'Unknown'}
            </dd>
          </dl>
        </article>
      </div>

      <article className="workspace-card customer-history-card">
        <p className="eyebrow">Order history</p>
        <h2>All customer orders</h2>
        {customer.orderHistory.length === 0 ? (
          <p>No orders are associated with this customer.</p>
        ) : (
          <>
            <div className="orders-table-wrap" hidden={isMobile}>
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Status</th>
                    <th>Package</th>
                    <th>Payment</th>
                    <th>Delivery</th>
                    <th>Total</th>
                    <th>Received</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orderHistory.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link to={`/orders/${order.id}`}>{order.orderNumber}</Link>
                        <small>{order.source.replaceAll('_', ' ')}</small>
                      </td>
                      <td>
                        <span className={`status-chip status-${order.status.toLowerCase()}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>{order.offerName}</td>
                      <td>
                        {order.paymentMethod}
                        <small>{order.paymentStatus}</small>
                      </td>
                      <td>{order.deliveryStatus.replaceAll('_', ' ')}</td>
                      <td>{formatMoney(order.totalAmount, order.currency)}</td>
                      <td>
                        {new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(
                          new Date(order.createdAt),
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isMobile && (
              <ResponsiveDataList
                ariaLabel="Customer order history"
                items={customer.orderHistory.map((order) => ({
                  id: order.id,
                  title: <Link to={`/orders/${order.id}`}>{order.orderNumber}</Link>,
                  description: order.source.replaceAll('_', ' '),
                  badge: (
                    <span className={`status-chip status-${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                  ),
                  fields: [
                    { label: 'Package', value: order.offerName },
                    { label: 'Payment', value: `${order.paymentMethod} · ${order.paymentStatus}` },
                    { label: 'Delivery', value: order.deliveryStatus.replaceAll('_', ' ') },
                    { label: 'Total', value: formatMoney(order.totalAmount, order.currency) },
                    {
                      label: 'Received',
                      value: new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(
                        new Date(order.createdAt),
                      ),
                    },
                  ],
                }))}
              />
            )}
          </>
        )}
      </article>
    </section>
  )
}
