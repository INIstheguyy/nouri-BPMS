import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { ModalDialog } from '../../shared/ui/ModalDialog'
import { useAuth } from '../auth/useAuth'
import { initializePrepaidPayment, markCodPaid } from './api/payments'
import type { OrderDetail, PrepaidInitialization } from './api/types'
import { useOrderInvalidation } from './hooks/useOrderInvalidation'

export function PaymentActions({ order }: { order: OrderDetail }) {
  const auth = useAuth()
  const { invalidateOrder } = useOrderInvalidation()
  const [showCodDialog, setShowCodDialog] = useState(false)
  const [collectionNote, setCollectionNote] = useState('')
  const [initialization, setInitialization] = useState<PrepaidInitialization | null>(null)

  const codMutation = useMutation({
    mutationFn: () => markCodPaid(order.id, collectionNote),
    onSuccess: async () => {
      setShowCodDialog(false)
      setCollectionNote('')
      await invalidateOrder(order.id)
    },
  })
  const prepaidMutation = useMutation({
    mutationFn: () => initializePrepaidPayment(order.id),
    onSuccess: async (result) => {
      setInitialization(result)
      await invalidateOrder(order.id)
    },
  })

  if (order.status !== 'CONFIRMED' || !auth.hasPermission('payment.update')) return null

  const canReconcileCod =
    order.payment.method === 'COD' &&
    order.payment.status === 'UNPAID' &&
    order.delivery.status === 'DELIVERED'
  const canInitializePrepaid =
    order.payment.method === 'PREPAID' && order.payment.status === 'PENDING'

  if (!canReconcileCod && !canInitializePrepaid && order.payment.status !== 'PAID') return null

  return (
    <section className="payment-workflow-panel" aria-labelledby="payment-workflow-title">
      <div>
        <p className="eyebrow">Payment workflow</p>
        <h2 id="payment-workflow-title">{order.payment.status}</h2>
        {order.payment.status === 'PAID' && <span>Payment has been reconciled.</span>}
        {canReconcileCod && <span>Confirm cash collection before completing this order.</span>}
        {canInitializePrepaid && (
          <span>Test adapter only. Initialization does not mark this payment paid.</span>
        )}
      </div>

      <div className="workflow-actions">
        {canReconcileCod && (
          <button className="primary-action" type="button" onClick={() => setShowCodDialog(true)}>
            Mark COD paid
          </button>
        )}
        {canInitializePrepaid && (
          <button
            className="primary-action"
            disabled={prepaidMutation.isPending}
            type="button"
            onClick={() => prepaidMutation.mutate()}
          >
            {prepaidMutation.isPending ? 'Initializing...' : 'Initialize test payment'}
          </button>
        )}
      </div>

      {initialization && (
        <div className="payment-prompt" role="status">
          <strong>Test payment initialized</strong>
          <span>
            Reference: {initialization.reference}. A correctly signed mock webhook is still required
            to confirm payment.
          </span>
        </div>
      )}
      {(codMutation.isError || prepaidMutation.isError) && (
        <div className="form-error">The payment action was rejected. Refresh and try again.</div>
      )}

      {showCodDialog && (
        <ModalDialog labelledBy="cod-payment-title" onClose={() => setShowCodDialog(false)}>
          <p className="eyebrow">Protected payment command</p>
          <h2 id="cod-payment-title">Mark COD paid</h2>
          <div className="dialog-fields">
            <p>Confirm that the cash for this delivered order was collected.</p>
            <label>
              Collection note <small>(optional)</small>
              <textarea
                maxLength={500}
                rows={3}
                value={collectionNote}
                onChange={(event) => setCollectionNote(event.target.value)}
              />
            </label>
          </div>
          <div className="dialog-actions">
            <button type="button" onClick={() => setShowCodDialog(false)}>
              Go back
            </button>
            <button
              className="primary-action"
              disabled={codMutation.isPending}
              type="button"
              onClick={() => codMutation.mutate()}
            >
              {codMutation.isPending ? 'Applying...' : 'Confirm cash collected'}
            </button>
          </div>
        </ModalDialog>
      )}
    </section>
  )
}
