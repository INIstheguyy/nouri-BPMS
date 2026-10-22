import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { useState } from 'react'

import { formatMoney } from '../../shared/lib/money'
import { phoneHref } from '../../shared/lib/phone'
import { queryKeys } from '../../shared/lib/query-keys'
import { BottomSheet } from '../../shared/ui/BottomSheet'
import { SlaRing } from '../../shared/ui/SlaRing'
import { listOrders } from './api/orders'
import type { OrderFilters, OrderSummary, WorkflowCommand } from './api/types'
import { runOrderWorkflowCommand } from './api/workflow'
import { useOrderInfo } from './hooks/useOrderInfo'

const filters: OrderFilters = {
  search: '',
  queue: 'new',
  status: '',
  source: '',
  paymentMethod: '',
  from: '',
  to: '',
  page: 1,
  pageSize: 50,
}

function ageMinutes(createdAt: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000))
}

function SwipeCard({
  order,
  onCall,
  onSkip,
}: {
  order: OrderSummary
  onCall: () => void
  onSkip: () => void
}) {
  const info = useOrderInfo(order)
  const age = ageMinutes(order.created_at)
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-15, 15])
  const callOpacity = useTransform(x, [0, 90], [0, 1])
  const whatsappOpacity = useTransform(x, [-90, 0], [1, 0])

  function finishDrag(_: MouseEvent | TouchEvent | PointerEvent, drag: PanInfo) {
    if (drag.offset.x > 90) {
      void animate(x, 0, { type: 'spring', stiffness: 350, damping: 28 })
      onCall()
      return
    }
    if (drag.offset.x < -90) {
      void animate(x, -window.innerWidth, { duration: 0.24 }).then(onSkip)
      return
    }
    void animate(x, 0, { type: 'spring', stiffness: 350, damping: 28 })
  }

  return (
    <motion.article
      aria-label={`New order from ${order.customer_name}`}
      className="absolute inset-0 z-10 grid touch-none grid-rows-[auto_1fr_auto] overflow-hidden rounded-[28px] border border-line bg-surface shadow-[0_28px_80px_rgb(13_31_23/0.18)]"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.75}
      style={{ x, rotate }}
      onDragEnd={finishDrag}
    >
      <motion.span
        className="pointer-events-none absolute top-8 left-6 z-10 -rotate-12 rounded-lg border-4 border-primary-mid px-3 py-1 font-display text-xl font-black text-primary-mid uppercase"
        style={{ opacity: whatsappOpacity }}
      >
        WhatsApp
      </motion.span>
      <motion.span
        className="pointer-events-none absolute top-8 right-6 z-10 rotate-12 rounded-lg border-4 border-gold px-3 py-1 font-display text-xl font-black text-gold uppercase"
        style={{ opacity: callOpacity }}
      >
        Call
      </motion.span>

      <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
        <span className="rounded-full bg-[var(--ok-tint)] px-3 py-1 text-xs font-black text-ok">
          New order
        </span>
        <span className="text-xs font-bold text-ink-2">{order.order_number}</span>
      </div>

      <div className="grid content-center justify-items-center px-6 text-center">
        <div className="relative mb-5 grid size-32 place-items-center">
          <SlaRing
            label={`${age} minutes waiting`}
            pct={age / 30}
            pulse={info.tone === 'crit'}
            size={128}
            tone={info.tone}
          />
          <span className="absolute grid justify-items-center">
            <strong className="font-display text-2xl leading-none">{age}</strong>
            <small className="mt-1 text-[10px] font-bold text-ink-2 uppercase">minutes</small>
          </span>
        </div>
        <h1 className="m-0 font-display text-3xl font-black tracking-[-0.03em] text-ink">
          {order.customer_name}
        </h1>
        <p className="mt-2 mb-0 text-sm text-ink-2">
          {order.delivery_area} · {order.offer_name}
        </p>
        <strong className="mt-5 font-display text-2xl text-primary">
          {formatMoney(order.total_amount, order.currency)}
        </strong>
        <span className="mt-2 rounded-full bg-surface-2 px-3 py-1 text-xs font-bold text-ink-2">
          {order.payment_method}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-line p-5 sm:p-6">
        <a
          className="grid min-h-12 place-items-center rounded-full border border-primary-mid bg-surface text-sm font-bold text-primary-mid no-underline"
          href={phoneHref(order.customer_phone, 'whatsapp')}
          rel="noreferrer"
          target="_blank"
          onClick={onSkip}
        >
          WhatsApp & next
        </a>
        <button
          className="min-h-12 rounded-full bg-primary text-sm font-bold text-on-primary"
          type="button"
          onClick={onCall}
        >
          Call customer
        </button>
      </div>
    </motion.article>
  )
}

export function NewOrdersPage() {
  const queryClient = useQueryClient()
  const ordersQuery = useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => listOrders(filters),
  })
  const [localCards, setLocalCards] = useState<OrderSummary[] | null>(null)
  const [selected, setSelected] = useState<OrderSummary | null>(null)
  const serverCards = ordersQuery.data?.orders ?? []
  const cards = localCards ?? serverCards

  const outcomeMutation = useMutation({
    mutationFn: (command: WorkflowCommand) => runOrderWorkflowCommand(command),
    onSuccess: async () => {
      if (selected) {
        setLocalCards((current) =>
          (current ?? serverCards).filter((order) => order.order_id !== selected.order_id),
        )
      }
      setSelected(null)
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() })
      setLocalCards(null)
    },
  })

  function moveToBack() {
    setLocalCards((current) => {
      const queue = current ?? serverCards
      return queue.length > 1 ? [...queue.slice(1), queue[0]!] : queue
    })
  }

  const top = cards[0]

  return (
    <section className="mx-auto grid h-full min-h-0 w-full max-w-[520px] grid-rows-[auto_minmax(0,1fr)_auto] gap-4">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold tracking-[0.14em] text-gold uppercase">
            First response
          </p>
          <h1 className="m-0 font-display text-[length:var(--display-lg)] font-black tracking-[-0.03em]">
            New orders
          </h1>
        </div>
        <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-ink-2">
          {cards.length} waiting
        </span>
      </header>

      <div className="relative min-h-[430px]">
        {ordersQuery.isPending && (
          <div className="absolute inset-0 animate-pulse rounded-[28px] bg-surface" />
        )}
        {ordersQuery.isError && (
          <div className="absolute inset-0 grid place-content-center rounded-[28px] border border-crit bg-[var(--crit-tint)] p-8 text-center text-sm font-bold text-crit">
            New orders could not be loaded.
          </div>
        )}
        {!ordersQuery.isPending && !ordersQuery.isError && !top && (
          <div className="absolute inset-0 grid place-content-center justify-items-center rounded-[28px] border border-dashed border-line bg-surface p-8 text-center">
            <span className="text-4xl text-ok" aria-hidden="true">
              ✓
            </span>
            <h2 className="mt-4 mb-1 font-display text-2xl font-bold">Queue cleared</h2>
            <p className="m-0 text-sm text-ink-2">Every new customer has been handled.</p>
          </div>
        )}
        {cards.slice(0, 3).map((order, index) => {
          if (index === 0) {
            return (
              <SwipeCard
                key={order.order_id}
                order={order}
                onCall={() => setSelected(order)}
                onSkip={moveToBack}
              />
            )
          }
          return (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-3 inset-y-0 rounded-[28px] border border-line bg-surface shadow-lg"
              key={order.order_id}
              style={{
                transform: `translateY(${index * 10}px) scale(${1 - index * 0.035})`,
                zIndex: 3 - index,
              }}
            />
          )
        })}
      </div>

      <p className="m-0 text-center text-xs font-semibold text-ink-2">
        Swipe right to call · Swipe left to move to the next order
      </p>

      <BottomSheet
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Call outcome"
      >
        {selected && (
          <div className="grid gap-4">
            <div className="rounded-2xl bg-surface-2 p-4">
              <strong className="font-display text-lg">{selected.customer_name}</strong>
              <p className="mt-1 mb-0 text-sm text-ink-2">{selected.customer_phone}</p>
            </div>
            <a
              className="grid min-h-12 place-items-center rounded-full bg-primary font-bold text-on-primary no-underline"
              href={phoneHref(selected.customer_phone, 'tel')}
            >
              Call now
            </a>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="min-h-12 rounded-full bg-primary-mid px-3 font-bold text-white disabled:opacity-50"
                disabled={outcomeMutation.isPending}
                type="button"
                onClick={() =>
                  outcomeMutation.mutate({ type: 'CONTACT', orderId: selected.order_id })
                }
              >
                Reached them
              </button>
              <button
                className="min-h-12 rounded-full bg-[var(--warn-tint)] px-3 font-bold text-warn disabled:opacity-50"
                disabled={outcomeMutation.isPending}
                type="button"
                onClick={() =>
                  outcomeMutation.mutate({ type: 'UNREACHABLE', orderId: selected.order_id })
                }
              >
                No answer
              </button>
            </div>
            {outcomeMutation.isError && (
              <p className="m-0 text-sm font-bold text-crit" role="alert">
                The call outcome could not be saved.
              </p>
            )}
          </div>
        )}
      </BottomSheet>
    </section>
  )
}
