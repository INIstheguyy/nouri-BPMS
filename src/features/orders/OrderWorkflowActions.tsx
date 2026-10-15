import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { useAuth } from '../auth/useAuth'
import {
  formatMoney,
  runOrderWorkflowCommand,
  type OrderDetail,
  type OrderStatus,
  type WorkflowCommand,
} from './api'

type PendingAction = WorkflowCommand['type'] | null

const cancellationReasons = [
  ['CUSTOMER_REQUEST', 'Customer request'],
  ['DUPLICATE_ORDER', 'Duplicate order'],
  ['OUT_OF_COVERAGE', 'Out of coverage'],
  ['UNREACHABLE', 'Unreachable'],
  ['INVALID_ORDER', 'Invalid order'],
  ['OTHER', 'Other'],
] as const

const statuses: OrderStatus[] = [
  'NEW',
  'CONTACTED',
  'UNREACHABLE',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
]

export function OrderWorkflowActions({ order }: { order: OrderDetail }) {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [reasonCode, setReasonCode] = useState('CUSTOMER_REQUEST')
  const [reasonNote, setReasonNote] = useState('')
  const [overrideStatus, setOverrideStatus] = useState<OrderStatus>('NEW')
  const mutation = useMutation({
    mutationFn: runOrderWorkflowCommand,
    onSuccess: async () => {
      setPendingAction(null)
      setReasonNote('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['order', order.id] }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
      ])
    },
  })

  const canContact = auth.hasPermission('order.contact')
  const canConfirm = auth.hasPermission('order.confirm')
  const canCancel = auth.hasPermission('order.cancel')
  const canOverride = auth.hasPermission('order.override')
  const showContact = canContact && ['NEW', 'UNREACHABLE'].includes(order.status)
  const showUnreachable = canContact && ['NEW', 'CONTACTED'].includes(order.status)
  const showConfirm = canConfirm && ['NEW', 'CONTACTED', 'UNREACHABLE'].includes(order.status)
  const showCancel =
    canCancel &&
    ['NEW', 'CONTACTED', 'UNREACHABLE', 'CONFIRMED'].includes(order.status) &&
    !['DELIVERED', 'RETURNED'].includes(order.delivery.status)
  const showComplete =
    canConfirm &&
    order.status === 'CONFIRMED' &&
    order.delivery.status === 'DELIVERED' &&
    order.payment.status === 'PAID'
  const effectiveOverrideStatus =
    overrideStatus === order.status
      ? (statuses.find((status) => status !== order.status) ?? 'NEW')
      : overrideStatus

  function submit(command: WorkflowCommand) {
    mutation.mutate(command)
  }

  return (
    <section className="workflow-panel" aria-labelledby="workflow-title">
      <div>
        <p className="eyebrow">Next action</p>
        <h2 id="workflow-title">Move this order forward</h2>
      </div>
      <div className="workflow-actions">
        {showContact && (
          <button type="button" onClick={() => submit({ type: 'CONTACT', orderId: order.id })}>
            Mark contacted
          </button>
        )}
        {showUnreachable && (
          <button type="button" onClick={() => submit({ type: 'UNREACHABLE', orderId: order.id })}>
            Mark unreachable
          </button>
        )}
        {showConfirm && (
          <button
            className="primary-action"
            type="button"
            onClick={() => setPendingAction('CONFIRM')}
          >
            Confirm order
          </button>
        )}
        {showCancel && (
          <button
            className="danger-action"
            type="button"
            onClick={() => setPendingAction('CANCEL')}
          >
            Cancel order
          </button>
        )}
        {showComplete && (
          <button
            className="primary-action"
            type="button"
            onClick={() => setPendingAction('COMPLETE')}
          >
            Complete order
          </button>
        )}
        {canOverride && (
          <button type="button" onClick={() => setPendingAction('OVERRIDE')}>
            Admin override
          </button>
        )}
      </div>
      {mutation.isError && (
        <div className="form-error">
          The workflow action was rejected. Refresh the order and try again.
        </div>
      )}

      {pendingAction && (
        <div
          className="workflow-dialog-backdrop"
          role="presentation"
          onMouseDown={() => setPendingAction(null)}
        >
          <section
            className="workflow-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="action-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">Protected workflow command</p>
            <h2 id="action-title">{actionTitle(pendingAction)}</h2>

            {pendingAction === 'CONFIRM' && (
              <div className="confirmation-review">
                <p>Verify these details before confirming:</p>
                <dl>
                  <dt>Customer</dt>
                  <dd>
                    {order.customer.firstName} {order.customer.lastName}
                  </dd>
                  <dt>Phone</dt>
                  <dd>{order.customer.phone}</dd>
                  <dt>Package</dt>
                  <dd>{order.offer.name}</dd>
                  <dt>Total</dt>
                  <dd>{formatMoney(order.totalAmount, order.currency)}</dd>
                  <dt>Payment</dt>
                  <dd>{order.paymentMethod}</dd>
                  <dt>Delivery</dt>
                  <dd>
                    {order.delivery.addressLine}, {order.delivery.area}, {order.delivery.state}
                  </dd>
                </dl>
              </div>
            )}

            {pendingAction === 'CANCEL' && (
              <div className="dialog-fields">
                <label>
                  Cancellation reason
                  <select
                    value={reasonCode}
                    onChange={(event) => setReasonCode(event.target.value)}
                  >
                    {cancellationReasons.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Reason note {reasonCode === 'OTHER' ? '(required)' : '(optional)'}
                  <textarea
                    rows={3}
                    value={reasonNote}
                    onChange={(event) => setReasonNote(event.target.value)}
                  />
                </label>
              </div>
            )}

            {pendingAction === 'OVERRIDE' && (
              <div className="dialog-fields">
                <label>
                  Target status
                  <select
                    value={effectiveOverrideStatus}
                    onChange={(event) => setOverrideStatus(event.target.value as OrderStatus)}
                  >
                    {statuses
                      .filter((status) => status !== order.status)
                      .map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                  </select>
                </label>
                <label>
                  Override reason (required)
                  <textarea
                    rows={4}
                    value={reasonNote}
                    onChange={(event) => setReasonNote(event.target.value)}
                  />
                </label>
                <p className="warning-banner">
                  This bypasses the normal transition path and will be recorded as an Executive
                  Admin override.
                </p>
              </div>
            )}

            {pendingAction === 'COMPLETE' && (
              <p>
                Delivery is recorded as delivered and payment is paid. Completing will close this
                order.
              </p>
            )}

            <div className="dialog-actions">
              <button type="button" onClick={() => setPendingAction(null)}>
                Go back
              </button>
              <button
                className={pendingAction === 'CANCEL' ? 'danger-action' : 'primary-action'}
                disabled={
                  mutation.isPending ||
                  (pendingAction === 'CANCEL' &&
                    reasonCode === 'OTHER' &&
                    reasonNote.trim().length < 3) ||
                  (pendingAction === 'OVERRIDE' && reasonNote.trim().length < 5)
                }
                type="button"
                onClick={() => {
                  if (pendingAction === 'CONFIRM') submit({ type: 'CONFIRM', orderId: order.id })
                  if (pendingAction === 'CANCEL')
                    submit({ type: 'CANCEL', orderId: order.id, reasonCode, reasonNote })
                  if (pendingAction === 'COMPLETE') submit({ type: 'COMPLETE', orderId: order.id })
                  if (pendingAction === 'OVERRIDE')
                    submit({
                      type: 'OVERRIDE',
                      orderId: order.id,
                      targetStatus: effectiveOverrideStatus,
                      reason: reasonNote,
                    })
                }}
              >
                {mutation.isPending ? 'Applying...' : actionTitle(pendingAction)}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

function actionTitle(action: Exclude<PendingAction, null>) {
  return {
    CONTACT: 'Mark contacted',
    UNREACHABLE: 'Mark unreachable',
    CONFIRM: 'Confirm order',
    CANCEL: 'Cancel order',
    COMPLETE: 'Complete order',
    OVERRIDE: 'Apply override',
  }[action]
}
