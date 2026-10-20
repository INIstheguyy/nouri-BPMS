import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'

import { formatMoney } from '../../shared/lib/money'
import { phoneHref } from '../../shared/lib/phone'
import { queryKeys } from '../../shared/lib/query-keys'
import { PageHeader } from '../../shared/ui/PageHeader'
import { ErrorState, LoadingState } from '../../shared/ui/ScreenState'
import { getOrderDetail, updateOrderNotes } from './api/orders'
import { DeliveryWorkflowActions } from './DeliveryWorkflowActions'
import { OrderWorkflowActions } from './OrderWorkflowActions'
import { PaymentActions } from './PaymentActions'
import { useOrderInvalidation } from './hooks/useOrderInvalidation'

function OrderDetailSection({
  title,
  summary,
  children,
}: {
  title: string
  summary: string
  children: ReactNode
}) {
  return (
    <details className="order-detail-section">
      <summary>
        <span>
          <strong>{title}</strong>
          <small>{summary}</small>
        </span>
        <span className="order-detail-section-toggle" aria-hidden="true" />
      </summary>
      <div className="order-detail-section-content">{children}</div>
    </details>
  )
}

function NotesForm({
  orderId,
  initialCustomerNote,
  initialInternalNote,
}: {
  orderId: string
  initialCustomerNote: string
  initialInternalNote: string
}) {
  const { invalidateOrder } = useOrderInvalidation()
  const [customerNote, setCustomerNote] = useState(initialCustomerNote)
  const [internalNote, setInternalNote] = useState(initialInternalNote)
  const notesMutation = useMutation({
    mutationFn: () => updateOrderNotes(orderId, customerNote, internalNote),
    onSuccess: async () => invalidateOrder(orderId),
  })

  return (
    <form
      className="notes-form"
      onSubmit={(event) => {
        event.preventDefault()
        notesMutation.mutate()
      }}
    >
      <label>
        Customer note
        <textarea
          maxLength={500}
          rows={3}
          value={customerNote}
          onChange={(event) => setCustomerNote(event.target.value)}
        />
      </label>
      <label>
        Internal note
        <textarea
          maxLength={2000}
          rows={4}
          value={internalNote}
          onChange={(event) => setInternalNote(event.target.value)}
        />
      </label>
      {notesMutation.isError && <div className="form-error">The notes could not be saved.</div>}
      {notesMutation.isSuccess && (
        <div className="form-notice" role="status">
          Notes saved and audited.
        </div>
      )}
      <button className="secondary-action" disabled={notesMutation.isPending} type="submit">
        {notesMutation.isPending ? 'Saving...' : 'Save notes'}
      </button>
    </form>
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
  const whatsapp = order.customer.whatsappPhone ?? order.customer.phone

  return (
    <section className="order-detail-page">
      <Link className="text-link" to="/orders">
        {'<-'} Back to orders
      </Link>
      <PageHeader
        className="detail-heading"
        eyebrow="Order detail"
        title={order.orderNumber}
        description={`Received ${new Intl.DateTimeFormat('en-NG', {
          dateStyle: 'full',
          timeStyle: 'short',
        }).format(new Date(order.createdAt))}`}
        actions={
          <div className="detail-actions">
            <span className={`status-chip status-${order.status.toLowerCase()}`}>
              {order.status}
            </span>
            <a className="secondary-action" href={phoneHref(order.customer.phone, 'tel')}>
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
        }
      />

      {order.possibleDuplicate && (
        <div className="warning-banner">
          This order may duplicate another active order from the same customer.
        </div>
      )}

      <OrderWorkflowActions order={order} />
      <DeliveryWorkflowActions
        key={`${order.delivery.status}-${order.delivery.scheduledDate ?? 'none'}`}
        order={order}
      />
      <PaymentActions
        key={`${order.payment.status}-${order.payment.providerReference ?? 'none'}`}
        order={order}
      />

      <div className="order-detail-sections" aria-label="Order information">
        <OrderDetailSection
          title="Customer"
          summary={`${order.customer.firstName} ${order.customer.lastName} · ${order.customer.phone}`}
        >
          <div className="detail-info-grid">
            <div className="detail-info-block">
              <h2>
                <Link to={`/customers/${order.customer.id}`}>
                  {order.customer.firstName} {order.customer.lastName}
                </Link>
              </h2>
              <dl>
                <dt>Phone</dt>
                <dd>{order.customer.phone}</dd>
                <dt>Email</dt>
                <dd>{order.customer.email ?? 'Not provided'}</dd>
                <dt>Source</dt>
                <dd>{order.source.replaceAll('_', ' ')}</dd>
              </dl>
            </div>
          </div>
        </OrderDetailSection>

        <OrderDetailSection
          title="Delivery"
          summary={`${order.delivery.status.replaceAll('_', ' ')} · ${order.delivery.area}`}
        >
          <div className="detail-info-grid">
            <div className="detail-info-block">
              <h2>{order.delivery.status.replaceAll('_', ' ')}</h2>
              <p>
                {order.delivery.addressLine}
                <br />
                {order.delivery.area}
                {order.delivery.city ? `, ${order.delivery.city}` : ''}
                <br />
                {order.delivery.state}
              </p>
              {order.delivery.landmark && <small>Landmark: {order.delivery.landmark}</small>}
            </div>
          </div>
        </OrderDetailSection>

        <OrderDetailSection
          title="Payment"
          summary={`${formatMoney(order.payment.amount, order.currency)} · ${order.payment.status}`}
        >
          <div className="detail-info-grid">
            <div className="detail-info-block">
              <h2>{formatMoney(order.payment.amount, order.currency)}</h2>
              <dl>
                <dt>Method</dt>
                <dd>{order.payment.method}</dd>
                <dt>Status</dt>
                <dd>{order.payment.status}</dd>
              </dl>
            </div>
          </div>
        </OrderDetailSection>

        <OrderDetailSection
          title="Package and total"
          summary={`${order.offer.name} · ${formatMoney(order.totalAmount, order.currency)}`}
        >
          <div className="detail-info-grid">
            <div className="detail-info-block">
              <h2>{order.offer.name}</h2>
              <ul className="line-items">
                {order.items.map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.quantity} x {item.name}
                      {item.type === 'BONUS' ? ' (bonus)' : ''}
                    </span>
                    <strong>{formatMoney(item.totalPrice, order.currency)}</strong>
                  </li>
                ))}
              </ul>
              <dl className="totals">
                <dt>Subtotal</dt>
                <dd>{formatMoney(order.subtotalAmount, order.currency)}</dd>
                <dt>Discount</dt>
                <dd>-{formatMoney(order.discountAmount, order.currency)}</dd>
                <dt>Total</dt>
                <dd>{formatMoney(order.totalAmount, order.currency)}</dd>
              </dl>
            </div>
          </div>
        </OrderDetailSection>

        <OrderDetailSection
          title="Notes"
          summary={
            order.customerNote || order.internalNote ? 'Notes recorded' : 'No notes recorded'
          }
        >
          <NotesForm
            key={order.updatedAt}
            orderId={order.id}
            initialCustomerNote={order.customerNote ?? ''}
            initialInternalNote={order.internalNote ?? ''}
          />
        </OrderDetailSection>

        <OrderDetailSection title="Activity" summary={`${order.timeline.length} recorded events`}>
          <ol className="timeline">
            {order.timeline.map((event) => (
              <li key={event.id}>
                <span className="status-dot" />
                <div>
                  <strong>{event.action.replaceAll('_', ' ')}</strong>
                  <small>
                    {new Intl.DateTimeFormat('en-NG', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(event.createdAt))}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        </OrderDetailSection>
      </div>
    </section>
  )
}
