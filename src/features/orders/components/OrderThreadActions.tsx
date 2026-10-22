import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { phoneHref } from '../../../shared/lib/phone'
import { formatMoney } from '../../../shared/lib/money'
import { BottomSheet } from '../../../shared/ui/BottomSheet'
import { useToast } from '../../../shared/ui/Toast'
import { useAuth } from '../../auth/useAuth'
import { runDeliveryCommand } from '../api/delivery'
import { addOrderNote } from '../api/orders'
import { markCodPaid } from '../api/payments'
import type { DeliveryCommand, OrderDetail, WorkflowCommand } from '../api/types'
import { runOrderWorkflowCommand } from '../api/workflow'
import { useOrderInvalidation } from '../hooks/useOrderInvalidation'

type Sheet = 'call' | 'confirm' | 'schedule' | 'outcome' | 'cash' | 'complete' | 'details' | null
type ThreadCommand =
  WorkflowCommand | DeliveryCommand | { type: 'CASH'; orderId: string; note: string }

const fieldClass =
  'min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-primary-mid focus:ring-3 focus:ring-[var(--tint)]'
const primaryClass =
  'min-h-11 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-50'

function today() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function nextAction(order: OrderDetail, hasPermission: (permission: string) => boolean) {
  if (order.status === 'CANCELLED') return { label: 'Order cancelled', sheet: null, disabled: true }
  if (order.status === 'COMPLETED') return { label: 'Order complete', sheet: null, disabled: true }
  if (order.status === 'NEW' || order.status === 'UNREACHABLE') {
    return { label: 'Call them', sheet: 'call' as const, disabled: !hasPermission('order.contact') }
  }
  if (order.status === 'CONTACTED') {
    return {
      label: 'Confirm order',
      sheet: 'confirm' as const,
      disabled: !hasPermission('order.confirm'),
    }
  }
  if (order.delivery.status === 'NOT_SCHEDULED' || order.delivery.status === 'FAILED') {
    return {
      label: order.delivery.status === 'FAILED' ? 'Schedule retry' : 'Schedule delivery',
      sheet: 'schedule' as const,
      disabled: !hasPermission('order.schedule'),
    }
  }
  if (order.delivery.status === 'SCHEDULED' || order.delivery.status === 'DISPATCHED') {
    const permission = order.delivery.status === 'SCHEDULED' ? 'order.dispatch' : 'order.deliver'
    return {
      label: 'Record outcome',
      sheet: 'outcome' as const,
      disabled: !hasPermission(permission),
    }
  }
  if (
    order.delivery.status === 'DELIVERED' &&
    order.payment.method === 'COD' &&
    order.payment.status === 'UNPAID'
  ) {
    return {
      label: 'Record cash',
      sheet: 'cash' as const,
      disabled: !hasPermission('payment.update'),
    }
  }
  if (order.delivery.status === 'DELIVERED' && order.payment.status === 'PAID') {
    return {
      label: 'Complete order',
      sheet: 'complete' as const,
      disabled: !hasPermission('order.confirm'),
    }
  }
  return { label: 'Awaiting payment', sheet: null, disabled: true }
}

export function OrderThreadActions({ order }: { order: OrderDetail }) {
  const auth = useAuth()
  const toast = useToast()
  const { invalidateOrder } = useOrderInvalidation()
  const [sheet, setSheet] = useState<Sheet>(null)
  const [teamNote, setTeamNote] = useState('')
  const [scheduledDate, setScheduledDate] = useState(order.delivery.scheduledDate ?? today())
  const [deliveryWindow, setDeliveryWindow] = useState(order.delivery.deliveryWindow ?? '')
  const [courierName, setCourierName] = useState(order.delivery.courierName ?? '')
  const [courierPhone, setCourierPhone] = useState('')
  const [trackingReference, setTrackingReference] = useState(order.delivery.trackingReference ?? '')
  const [failureReason, setFailureReason] = useState('NO_ANSWER')
  const [actionNote, setActionNote] = useState('')
  const whatsapp = order.customer.whatsappPhone ?? order.customer.phone
  const action = nextAction(order, auth.hasPermission)

  const commandMutation = useMutation({
    mutationFn: async (command: ThreadCommand) => {
      if (command.type === 'CASH') return markCodPaid(command.orderId, command.note)
      if (['SCHEDULE', 'DISPATCH', 'DELIVER', 'FAIL'].includes(command.type)) {
        return runDeliveryCommand(command as DeliveryCommand)
      }
      return runOrderWorkflowCommand(command as WorkflowCommand)
    },
    onSuccess: async () => {
      setSheet(null)
      setActionNote('')
      await invalidateOrder(order.id, { deliveryAttention: true })
      toast('Order updated.')
    },
  })
  const noteMutation = useMutation({
    mutationFn: () => addOrderNote(order.id, teamNote.trim()),
    onSuccess: async () => {
      setTeamNote('')
      await invalidateOrder(order.id)
      toast('Team note added.')
    },
  })

  function submit(command: ThreadCommand) {
    commandMutation.mutate(command)
  }

  return (
    <>
      <footer className="border-t border-line bg-surface p-3 shadow-[0_-10px_30px_rgb(13_31_23/0.06)] sm:p-4">
        <form
          className="mb-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (teamNote.trim()) noteMutation.mutate()
          }}
        >
          <label className="sr-only" htmlFor="team-note">
            Note for the team
          </label>
          <input
            className="min-w-0 flex-1 rounded-full border border-line bg-background px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-2 focus:border-primary-mid"
            id="team-note"
            maxLength={2000}
            placeholder="Add a note for the team…"
            value={teamNote}
            onChange={(event) => setTeamNote(event.target.value)}
          />
          <button
            aria-label="Send note"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 font-bold text-ink disabled:opacity-40"
            disabled={!teamNote.trim() || noteMutation.isPending}
            type="submit"
          >
            ↑
          </button>
        </form>

        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2">
          <button
            className={primaryClass}
            disabled={action.disabled}
            type="button"
            onClick={() => setSheet(action.sheet)}
          >
            {action.label}
          </button>
          <a
            aria-label="Call customer"
            className="grid size-11 place-items-center rounded-full border border-line bg-surface text-lg text-ink no-underline"
            href={phoneHref(order.customer.phone, 'tel')}
          >
            ☎
          </a>
          <a
            aria-label="WhatsApp customer"
            className="grid size-11 place-items-center rounded-full border border-line bg-surface text-sm font-black text-primary no-underline"
            href={phoneHref(whatsapp, 'whatsapp')}
            rel="noreferrer"
            target="_blank"
          >
            WA
          </a>
          <button
            aria-label="More order details"
            className="grid size-11 place-items-center rounded-full border border-line bg-surface text-xl text-ink"
            type="button"
            onClick={() => setSheet('details')}
          >
            ···
          </button>
        </div>
        {(noteMutation.isError || commandMutation.isError) && (
          <p className="mt-2 mb-0 text-xs font-bold text-crit" role="alert">
            That update could not be saved. Refresh and try again.
          </p>
        )}
      </footer>

      <BottomSheet isOpen={sheet === 'call'} onClose={() => setSheet(null)} title="Call outcome">
        <div className="grid gap-4">
          <p className="m-0 text-sm text-ink-2">
            Call {order.customer.firstName}, then record what happened.
          </p>
          <a
            className={`${primaryClass} text-center no-underline`}
            href={phoneHref(order.customer.phone, 'tel')}
          >
            Call {order.customer.phone}
          </a>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={primaryClass}
              type="button"
              onClick={() => submit({ type: 'CONTACT', orderId: order.id })}
            >
              Reached them
            </button>
            <button
              className="min-h-11 rounded-full bg-[var(--warn-tint)] px-4 font-bold text-warn"
              type="button"
              onClick={() => submit({ type: 'UNREACHABLE', orderId: order.id })}
            >
              No answer
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={sheet === 'confirm'}
        onClose={() => setSheet(null)}
        title="Confirm order"
      >
        <div className="grid gap-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl bg-surface-2 p-4 text-sm [&_dd]:m-0 [&_dd]:text-right [&_dd]:font-bold [&_dt]:text-ink-2">
            <dt>Customer</dt>
            <dd>
              {order.customer.firstName} {order.customer.lastName}
            </dd>
            <dt>Package</dt>
            <dd>{order.offer.name}</dd>
            <dt>Total</dt>
            <dd>{formatMoney(order.totalAmount, order.currency)}</dd>
            <dt>Delivery</dt>
            <dd>
              {order.delivery.area}, {order.delivery.state}
            </dd>
          </dl>
          <button
            className={primaryClass}
            disabled={commandMutation.isPending}
            type="button"
            onClick={() => submit({ type: 'CONFIRM', orderId: order.id })}
          >
            Confirm order
          </button>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={sheet === 'schedule'}
        onClose={() => setSheet(null)}
        title={order.delivery.status === 'FAILED' ? 'Schedule retry' : 'Schedule delivery'}
      >
        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-bold">
            Delivery date
            <input
              className={fieldClass}
              min={today()}
              type="date"
              value={scheduledDate}
              onChange={(event) => setScheduledDate(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold">
            Delivery window <span className="font-normal text-ink-2">Optional</span>
            <input
              className={fieldClass}
              placeholder="e.g. 9am – 1pm"
              value={deliveryWindow}
              onChange={(event) => setDeliveryWindow(event.target.value)}
            />
          </label>
          <button
            className={primaryClass}
            disabled={!scheduledDate || commandMutation.isPending}
            type="button"
            onClick={() =>
              submit({
                type: 'SCHEDULE',
                orderId: order.id,
                scheduledDate,
                deliveryWindow,
                recipientName: order.delivery.recipientName,
                recipientPhone: order.delivery.recipientPhone,
                state: order.delivery.state,
                city: order.delivery.city ?? '',
                area: order.delivery.area,
                addressLine: order.delivery.addressLine,
                landmark: order.delivery.landmark ?? '',
                note: actionNote,
              })
            }
          >
            Save delivery
          </button>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={sheet === 'outcome'}
        onClose={() => setSheet(null)}
        title="Record delivery outcome"
      >
        {order.delivery.status === 'SCHEDULED' ? (
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-bold">
              Courier name{' '}
              <input
                className={fieldClass}
                value={courierName}
                onChange={(event) => setCourierName(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold">
              Courier phone{' '}
              <input
                className={fieldClass}
                inputMode="tel"
                value={courierPhone}
                onChange={(event) => setCourierPhone(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold">
              Tracking reference{' '}
              <input
                className={fieldClass}
                value={trackingReference}
                onChange={(event) => setTrackingReference(event.target.value)}
              />
            </label>
            <button
              className={primaryClass}
              disabled={commandMutation.isPending}
              type="button"
              onClick={() =>
                submit({
                  type: 'DISPATCH',
                  orderId: order.id,
                  courierName,
                  courierPhone,
                  trackingReference,
                  note: actionNote,
                })
              }
            >
              Mark dispatched
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            <button
              className={primaryClass}
              disabled={commandMutation.isPending}
              type="button"
              onClick={() => submit({ type: 'DELIVER', orderId: order.id, note: actionNote })}
            >
              Delivered successfully
            </button>
            <div className="h-px bg-line" />
            <label className="grid gap-1.5 text-sm font-bold">
              Failure reason
              <select
                className={fieldClass}
                value={failureReason}
                onChange={(event) => setFailureReason(event.target.value)}
              >
                <option value="NO_ANSWER">No answer</option>
                <option value="CUSTOMER_UNAVAILABLE">Customer unavailable</option>
                <option value="WRONG_ADDRESS">Wrong address</option>
                <option value="CUSTOMER_CANCELLED">Customer cancelled</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-bold">
              Note
              <textarea
                className={fieldClass}
                rows={3}
                value={actionNote}
                onChange={(event) => setActionNote(event.target.value)}
              />
            </label>
            <button
              className="min-h-11 rounded-full bg-crit px-5 font-bold text-white disabled:opacity-50"
              disabled={
                commandMutation.isPending ||
                (failureReason === 'OTHER' && actionNote.trim().length < 3)
              }
              type="button"
              onClick={() =>
                submit({
                  type: 'FAIL',
                  orderId: order.id,
                  reasonCode: failureReason,
                  reasonNote: actionNote,
                })
              }
            >
              Mark delivery failed
            </button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet isOpen={sheet === 'cash'} onClose={() => setSheet(null)} title="Record cash">
        <div className="grid gap-4">
          <p className="m-0 text-sm text-ink-2">
            Confirm that {formatMoney(order.payment.amount, order.currency)} was collected.
          </p>
          <label className="grid gap-1.5 text-sm font-bold">
            Collection note{' '}
            <textarea
              className={fieldClass}
              rows={3}
              value={actionNote}
              onChange={(event) => setActionNote(event.target.value)}
            />
          </label>
          <button
            className={primaryClass}
            disabled={commandMutation.isPending}
            type="button"
            onClick={() => submit({ type: 'CASH', orderId: order.id, note: actionNote })}
          >
            Confirm cash collected
          </button>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={sheet === 'complete'}
        onClose={() => setSheet(null)}
        title="Complete order"
      >
        <div className="grid gap-4">
          <p className="m-0 text-sm text-ink-2">
            Delivery and payment are complete. Close this order?
          </p>
          <button
            className={primaryClass}
            disabled={commandMutation.isPending}
            type="button"
            onClick={() => submit({ type: 'COMPLETE', orderId: order.id })}
          >
            Complete order
          </button>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={sheet === 'details'}
        onClose={() => setSheet(null)}
        title="Order details"
      >
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm [&_dd]:m-0 [&_dd]:text-right [&_dd]:font-bold [&_dt]:text-ink-2">
          <dt>Package</dt>
          <dd>{order.offer.name}</dd>
          <dt>Total</dt>
          <dd>{formatMoney(order.totalAmount, order.currency)}</dd>
          <dt>Payment</dt>
          <dd>
            {order.payment.method} · {order.payment.status}
          </dd>
          <dt>Address</dt>
          <dd>
            {order.delivery.addressLine}, {order.delivery.area}, {order.delivery.state}
          </dd>
          <dt>Source</dt>
          <dd>{order.source.replaceAll('_', ' ')}</dd>
        </dl>
      </BottomSheet>
    </>
  )
}
