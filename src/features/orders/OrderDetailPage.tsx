import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { formatMoney, getOrderDetail, phoneHref, updateOrderNotes } from './api'
import { DeliveryWorkflowActions } from './DeliveryWorkflowActions'
import { OrderWorkflowActions } from './OrderWorkflowActions'
import { PaymentActions } from './PaymentActions'

function NotesForm({
  orderId,
  initialCustomerNote,
  initialInternalNote,
}: {
  orderId: string
  initialCustomerNote: string
  initialInternalNote: string
}) {
  const queryClient = useQueryClient()
  const [customerNote, setCustomerNote] = useState(initialCustomerNote)
  const [internalNote, setInternalNote] = useState(initialInternalNote)
  const notesMutation = useMutation({
    mutationFn: () => updateOrderNotes(orderId, customerNote, internalNote),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
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
    queryKey: ['order', orderId],
    queryFn: () => getOrderDetail(orderId),
    enabled: Boolean(orderId),
  })

  if (detailQuery.isPending) return <div className="workspace-state">Loading order...</div>
  if (detailQuery.isError || !detailQuery.data)
    return <div className="form-error">This order could not be loaded.</div>

  const order = detailQuery.data
  const whatsapp = order.customer.whatsappPhone ?? order.customer.phone

  return (
    <section className="order-detail-page">
      <Link className="text-link" to="/orders">
        {'<-'} Back to orders
      </Link>
      <div className="page-heading-row detail-heading">
        <div>
          <p className="eyebrow">Order detail</p>
          <h1>{order.orderNumber}</h1>
          <p>
            Received{' '}
            {new Intl.DateTimeFormat('en-NG', { dateStyle: 'full', timeStyle: 'short' }).format(
              new Date(order.createdAt),
            )}
          </p>
        </div>
        <div className="detail-actions">
          <span className={`status-chip status-${order.status.toLowerCase()}`}>{order.status}</span>
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
      </div>

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

      <div className="detail-grid">
        <article className="workspace-card">
          <p className="eyebrow">Customer</p>
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
        </article>
        <article className="workspace-card">
          <p className="eyebrow">Delivery</p>
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
        </article>
        <article className="workspace-card">
          <p className="eyebrow">Payment</p>
          <h2>{formatMoney(order.payment.amount, order.currency)}</h2>
          <dl>
            <dt>Method</dt>
            <dd>{order.payment.method}</dd>
            <dt>Status</dt>
            <dd>{order.payment.status}</dd>
          </dl>
        </article>
      </div>

      <div className="detail-grid detail-grid-wide">
        <article className="workspace-card">
          <p className="eyebrow">Package</p>
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
        </article>
        <article className="workspace-card">
          <p className="eyebrow">Allowed notes</p>
          <NotesForm
            key={order.updatedAt}
            orderId={order.id}
            initialCustomerNote={order.customerNote ?? ''}
            initialInternalNote={order.internalNote ?? ''}
          />
        </article>
      </div>

      <article className="workspace-card timeline-card">
        <p className="eyebrow">Timeline</p>
        <h2>Order activity</h2>
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
      </article>
    </section>
  )
}
