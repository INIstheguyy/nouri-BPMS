import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'

import { formatMoney } from '../../shared/lib/money'
import { queryKeys } from '../../shared/lib/query-keys'
import { ErrorState, LoadingState } from '../../shared/ui/ScreenState'
import { SlaRing } from '../../shared/ui/SlaRing'
import { getExecutiveDashboard, getRevenueSeries } from '../dashboard/api'
import { RevenueChart } from './RevenueChart'

type Period = '7d' | '30d' | 'month'

const periods: { value: Period; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'month', label: 'This month' },
]

function localDate(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function periodRange(period: Period, today = new Date()) {
  const from = new Date(today)
  if (period === '7d') from.setDate(from.getDate() - 6)
  if (period === '30d') from.setDate(from.getDate() - 29)
  if (period === 'month') from.setDate(1)
  return { from: localDate(from), to: localDate(today) }
}

function FunnelStage({ label, count, pct }: { label: string; count: number; pct: number }) {
  return (
    <li>
      <div className="funnel-label">
        <span>{label}</span>
        <strong>{count.toLocaleString('en-NG')}</strong>
      </div>
      <div className="funnel-track">
        <motion.div
          className="funnel-fill"
          initial={{ width: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          viewport={{ once: true, amount: 0.5 }}
          whileInView={{ width: `${Math.max(pct, count ? 4 : 0)}%` }}
        />
      </div>
      <span className="funnel-pct">{Math.round(pct)}%</span>
    </li>
  )
}

function HealthRing({
  label,
  value,
  goodWhenHigh = false,
}: {
  label: string
  value: number
  goodWhenHigh?: boolean
}) {
  const healthy = goodWhenHigh ? value >= 70 : value <= 10
  const warning = goodWhenHigh ? value >= 45 : value <= 20
  const tone = healthy ? 'ok' : warning ? 'warn' : 'crit'
  return (
    <article className="health-stat">
      <div className="health-ring">
        <SlaRing label={`${label}: ${value}%`} pct={value / 100} size={94} tone={tone} />
        <strong>{Math.round(value)}%</strong>
      </div>
      <span>{label}</span>
    </article>
  )
}

export function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d')
  const range = periodRange(period)
  const executiveQuery = useQuery({
    queryKey: queryKeys.dashboard.executive(range),
    queryFn: () => getExecutiveDashboard(range.from, range.to),
  })
  const revenueQuery = useQuery({
    queryKey: queryKeys.dashboard.revenue(range),
    queryFn: () => getRevenueSeries(range.from, range.to),
  })

  const hasError = executiveQuery.isError || revenueQuery.isError
  const isPending = executiveQuery.isPending || revenueQuery.isPending
  const data = executiveQuery.data

  const funnel = data
    ? [
        { label: 'Submitted', count: data.metrics.submittedOrders },
        { label: 'Confirmed', count: data.metrics.confirmedOrders },
        { label: 'Delivered', count: data.metrics.deliveredOrders },
        { label: 'Paid', count: data.metrics.paidOrders },
      ]
    : []
  const submitted = data?.metrics.submittedOrders ?? 0

  return (
    <section className="analytics-page">
      <header className="analytics-header">
        <div>
          <p className="eyebrow">Executive view</p>
          <h1>Analytics</h1>
        </div>
        <div aria-label="Analytics period" className="period-selector" role="group">
          {periods.map((option) => (
            <button
              key={option.value}
              aria-pressed={period === option.value}
              onClick={() => setPeriod(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      {isPending && <LoadingState>Loading business performance...</LoadingState>}
      {hasError && <ErrorState>Analytics could not be loaded.</ErrorState>}

      {data && revenueQuery.data && (
        <div className="analytics-grid">
          <article className="analytics-card revenue-card">
            <div className="analytics-card-heading">
              <div>
                <p className="eyebrow">Paid revenue</p>
                <h2>{formatMoney(data.metrics.paidRevenue, data.currency)}</h2>
              </div>
              <span>
                {range.from} — {range.to}
              </span>
            </div>
            <RevenueChart currency={data.currency} points={revenueQuery.data} />
          </article>

          <article className="analytics-card funnel-card">
            <div className="analytics-card-heading">
              <div>
                <p className="eyebrow">Conversion</p>
                <h2>Order funnel</h2>
              </div>
              <span>{data.metrics.paidConversion}% paid</span>
            </div>
            <ol className="conversion-funnel">
              {funnel.map((stage) => (
                <FunnelStage
                  key={stage.label}
                  count={stage.count}
                  label={stage.label}
                  pct={submitted === 0 ? 0 : (stage.count / submitted) * 100}
                />
              ))}
            </ol>
          </article>

          <article className="analytics-card health-card">
            <div className="analytics-card-heading">
              <div>
                <p className="eyebrow">Fulfilment</p>
                <h2>Delivery health</h2>
              </div>
              <span>{data.metrics.deliveredOrders} delivered</span>
            </div>
            <div className="health-grid">
              <HealthRing goodWhenHigh label="Cash collected" value={data.metrics.paidConversion} />
              <HealthRing label="Cancelled rate" value={data.metrics.cancellationRate} />
              <HealthRing label="Failed delivery" value={data.metrics.failedDeliveryRate} />
            </div>
          </article>

          <article className="analytics-card source-card">
            <div className="analytics-card-heading">
              <div>
                <p className="eyebrow">Acquisition</p>
                <h2>Top sources</h2>
              </div>
              <span>{data.metrics.submittedOrders} orders</span>
            </div>
            {data.sourceBreakdown.length === 0 ? (
              <p className="analytics-empty">No orders in this period.</p>
            ) : (
              <ul className="source-list">
                {data.sourceBreakdown.slice(0, 5).map((source) => (
                  <li key={source.source}>
                    <span>{source.source.replaceAll('_', ' ')}</span>
                    <strong>{source.submittedOrders}</strong>
                    <small>{formatMoney(source.paidRevenue, data.currency)}</small>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      )}
    </section>
  )
}
