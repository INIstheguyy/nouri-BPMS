import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { ModalDialog } from '../../shared/ui/ModalDialog'
import { useAuth } from '../auth/useAuth'
import { runDeliveryCommand } from './api/delivery'
import type { DeliveryCommand, OrderDetail } from './api/types'
import { useOrderInvalidation } from './hooks/useOrderInvalidation'

type DeliveryAction = DeliveryCommand['type'] | null

const failureReasons = [
  ['CUSTOMER_UNAVAILABLE', 'Customer unavailable'],
  ['WRONG_ADDRESS', 'Wrong address'],
  ['NO_ANSWER', 'No answer'],
  ['CUSTOMER_CANCELLED', 'Customer cancelled'],
  ['PAYMENT_UNAVAILABLE', 'Payment unavailable'],
  ['COURIER_ISSUE', 'Courier issue'],
  ['OTHER', 'Other'],
] as const

function today() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

export function DeliveryWorkflowActions({ order }: { order: OrderDetail }) {
  const auth = useAuth()
  const { invalidateOrder } = useOrderInvalidation()
  const [action, setAction] = useState<DeliveryAction>(null)
  const [scheduledDate, setScheduledDate] = useState(order.delivery.scheduledDate ?? today())
  const [deliveryWindow, setDeliveryWindow] = useState(order.delivery.deliveryWindow ?? '')
  const [recipientName, setRecipientName] = useState(order.delivery.recipientName)
  const [recipientPhone, setRecipientPhone] = useState(order.delivery.recipientPhone)
  const [state, setState] = useState(order.delivery.state)
  const [city, setCity] = useState(order.delivery.city ?? '')
  const [area, setArea] = useState(order.delivery.area)
  const [addressLine, setAddressLine] = useState(order.delivery.addressLine)
  const [landmark, setLandmark] = useState(order.delivery.landmark ?? '')
  const [courierName, setCourierName] = useState(order.delivery.courierName ?? '')
  const [courierPhone, setCourierPhone] = useState('')
  const [trackingReference, setTrackingReference] = useState(order.delivery.trackingReference ?? '')
  const [reasonCode, setReasonCode] = useState('CUSTOMER_UNAVAILABLE')
  const [note, setNote] = useState('')
  const mutation = useMutation({
    mutationFn: runDeliveryCommand,
    onSuccess: async () => {
      setAction(null)
      setNote('')
      await invalidateOrder(order.id, { deliveryAttention: true })
    },
  })

  if (order.status !== 'CONFIRMED') return null

  const canSchedule = auth.hasPermission('order.schedule')
  const canDispatch = auth.hasPermission('order.dispatch')
  const canDeliver = auth.hasPermission('order.deliver')
  const canFail = auth.hasPermission('order.fail_delivery')
  const canSubmitSchedule =
    scheduledDate >= today() &&
    recipientName.trim().length >= 2 &&
    recipientPhone.trim().length >= 10 &&
    state.trim().length >= 2 &&
    area.trim().length >= 2 &&
    addressLine.trim().length >= 5

  function submit(command: DeliveryCommand) {
    mutation.mutate(command)
  }

  return (
    <section className="delivery-workflow-panel" aria-labelledby="delivery-workflow-title">
      <div>
        <p className="eyebrow">Delivery workflow</p>
        <h2 id="delivery-workflow-title">{order.delivery.status.replaceAll('_', ' ')}</h2>
      </div>
      <div className="workflow-actions">
        {canSchedule &&
          ['NOT_SCHEDULED', 'SCHEDULED', 'FAILED'].includes(order.delivery.status) && (
            <button className="primary-action" type="button" onClick={() => setAction('SCHEDULE')}>
              {order.delivery.status === 'SCHEDULED'
                ? 'Reschedule'
                : order.delivery.status === 'FAILED'
                  ? 'Schedule retry'
                  : 'Schedule delivery'}
            </button>
          )}
        {canDispatch && order.delivery.status === 'SCHEDULED' && (
          <button className="primary-action" type="button" onClick={() => setAction('DISPATCH')}>
            Dispatch order
          </button>
        )}
        {canDeliver && order.delivery.status === 'DISPATCHED' && (
          <button className="primary-action" type="button" onClick={() => setAction('DELIVER')}>
            Mark delivered
          </button>
        )}
        {canFail && order.delivery.status === 'DISPATCHED' && (
          <button className="danger-action" type="button" onClick={() => setAction('FAIL')}>
            Mark failed
          </button>
        )}
      </div>

      {mutation.isError && (
        <div className="form-error">
          The delivery action was rejected. Refresh the order and try again.
        </div>
      )}

      {action && (
        <ModalDialog labelledBy="delivery-action-title" onClose={() => setAction(null)}>
          <p className="eyebrow">Protected delivery command</p>
          <h2 id="delivery-action-title">{deliveryActionTitle(action, order.delivery.status)}</h2>

          {action === 'SCHEDULE' && (
            <div className="dialog-fields form-grid">
              <label>
                Scheduled date
                <input
                  type="date"
                  min={today()}
                  value={scheduledDate}
                  onChange={(event) => setScheduledDate(event.target.value)}
                />
              </label>
              <label>
                Delivery window <small>(optional)</small>
                <input
                  value={deliveryWindow}
                  onChange={(event) => setDeliveryWindow(event.target.value)}
                  placeholder="e.g. 9am - 1pm"
                />
              </label>
              <label>
                Recipient name
                <input
                  value={recipientName}
                  onChange={(event) => setRecipientName(event.target.value)}
                />
              </label>
              <label>
                Recipient phone
                <input
                  inputMode="tel"
                  value={recipientPhone}
                  onChange={(event) => setRecipientPhone(event.target.value)}
                />
              </label>
              <label>
                State
                <input value={state} onChange={(event) => setState(event.target.value)} />
              </label>
              <label>
                City <small>(optional)</small>
                <input value={city} onChange={(event) => setCity(event.target.value)} />
              </label>
              <label className="wide-field">
                Area
                <input value={area} onChange={(event) => setArea(event.target.value)} />
              </label>
              <label className="wide-field">
                Address
                <textarea
                  rows={3}
                  value={addressLine}
                  onChange={(event) => setAddressLine(event.target.value)}
                />
              </label>
              <label className="wide-field">
                Landmark <small>(optional)</small>
                <input value={landmark} onChange={(event) => setLandmark(event.target.value)} />
              </label>
              <label className="wide-field">
                Schedule note <small>(optional)</small>
                <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
              </label>
            </div>
          )}

          {action === 'DISPATCH' && (
            <div className="dialog-fields">
              <label>
                Courier name <small>(optional)</small>
                <input
                  value={courierName}
                  onChange={(event) => setCourierName(event.target.value)}
                />
              </label>
              <label>
                Courier phone <small>(optional)</small>
                <input
                  inputMode="tel"
                  value={courierPhone}
                  onChange={(event) => setCourierPhone(event.target.value)}
                />
              </label>
              <label>
                Tracking reference <small>(optional)</small>
                <input
                  value={trackingReference}
                  onChange={(event) => setTrackingReference(event.target.value)}
                />
              </label>
              <label>
                Dispatch note <small>(optional)</small>
                <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
              </label>
            </div>
          )}

          {action === 'DELIVER' && (
            <div className="dialog-fields">
              <p>Confirm that the customer received this delivery.</p>
              <label>
                Delivery note <small>(optional)</small>
                <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
              </label>
            </div>
          )}

          {action === 'FAIL' && (
            <div className="dialog-fields">
              <label>
                Failure reason
                <select value={reasonCode} onChange={(event) => setReasonCode(event.target.value)}>
                  {failureReasons.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Failure note {reasonCode === 'OTHER' ? '(required)' : '(optional)'}
                <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
              </label>
            </div>
          )}

          <div className="dialog-actions">
            <button type="button" onClick={() => setAction(null)}>
              Go back
            </button>
            <button
              className={action === 'FAIL' ? 'danger-action' : 'primary-action'}
              disabled={
                mutation.isPending ||
                (action === 'SCHEDULE' && !canSubmitSchedule) ||
                (action === 'FAIL' && reasonCode === 'OTHER' && note.trim().length < 3)
              }
              type="button"
              onClick={() => {
                if (action === 'SCHEDULE')
                  submit({
                    type: 'SCHEDULE',
                    orderId: order.id,
                    scheduledDate,
                    deliveryWindow,
                    recipientName,
                    recipientPhone,
                    state,
                    city,
                    area,
                    addressLine,
                    landmark,
                    note,
                  })
                if (action === 'DISPATCH')
                  submit({
                    type: 'DISPATCH',
                    orderId: order.id,
                    courierName,
                    courierPhone,
                    trackingReference,
                    note,
                  })
                if (action === 'DELIVER') submit({ type: 'DELIVER', orderId: order.id, note })
                if (action === 'FAIL')
                  submit({ type: 'FAIL', orderId: order.id, reasonCode, reasonNote: note })
              }}
            >
              {mutation.isPending
                ? 'Applying...'
                : deliveryActionTitle(action, order.delivery.status)}
            </button>
          </div>
        </ModalDialog>
      )}
    </section>
  )
}

function deliveryActionTitle(action: Exclude<DeliveryAction, null>, status: string) {
  if (action === 'SCHEDULE')
    return status === 'SCHEDULED'
      ? 'Reschedule delivery'
      : status === 'FAILED'
        ? 'Schedule retry'
        : 'Schedule delivery'
  return { DISPATCH: 'Dispatch order', DELIVER: 'Mark delivered', FAIL: 'Mark delivery failed' }[
    action
  ]
}
