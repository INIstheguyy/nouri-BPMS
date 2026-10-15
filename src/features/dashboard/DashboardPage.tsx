import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { getExecutiveDashboard, getOperationsDashboard } from './api'
import { useAuth } from '../auth/useAuth'
import { formatMoney } from '../orders/api'

function localDate(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function firstDayOfMonth() {
  const today = new Date()
  return localDate(new Date(today.getFullYear(), today.getMonth(), 1))
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function Queue({
  title,
  empty,
  items,
}: {
  title: string
  empty: string
  items: Array<{ orderId: string; orderNumber: string; customerName: string; detail: string }>
}) {
  return (
    <article className="dashboard-queue workspace-card">
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p>{empty}</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.orderId}>
              <Link to={`/orders/${item.orderId}`}>
                <strong>{item.orderNumber}</strong>
                <span>{item.customerName}</span>
              </Link>
              <small>{item.detail}</small>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export function DashboardPage() {
  const auth = useAuth()
  const [operationsDate, setOperationsDate] = useState(localDate())
  const [executiveRange, setExecutiveRange] = useState({
    from: firstDayOfMonth(),
    to: localDate(),
  })
  const [draftRange, setDraftRange] = useState(executiveRange)
  const canReadOperations = auth.hasPermission('dashboard.operations.read')
  const canReadExecutive = auth.hasPermission('dashboard.executive.read')
  const operationsQuery = useQuery({
    queryKey: ['operations-dashboard', operationsDate],
    queryFn: () => getOperationsDashboard(operationsDate),
    enabled: canReadOperations,
  })
  const executiveQuery = useQuery({
    queryKey: ['executive-dashboard', executiveRange],
    queryFn: () => getExecutiveDashboard(executiveRange.from, executiveRange.to),
    enabled: canReadExecutive,
  })

  return (
    <section className="dashboard-page">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Role-aware overview</p>
          <h1>Dashboard</h1>
          <p>Operational work and business performance calculated securely in Postgres.</p>
        </div>
      </div>

      {canReadOperations && (
        <section className="dashboard-section" aria-labelledby="operations-dashboard-title">
          <div className="dashboard-section-heading">
            <div>
              <p className="eyebrow">Operations</p>
              <h2 id="operations-dashboard-title">Work requiring attention</h2>
            </div>
            <label>
              Work date
              <input
                type="date"
                value={operationsDate}
                onChange={(event) => setOperationsDate(event.target.value)}
              />
            </label>
          </div>

          {operationsQuery.isPending && (
            <div className="workspace-state">Loading operations...</div>
          )}
          {operationsQuery.isError && (
            <div className="form-error">The operations dashboard could not be loaded.</div>
          )}
          {operationsQuery.data && (
            <>
              <div className="dashboard-metrics">
                <MetricCard label="New orders" value={operationsQuery.data.metrics.newOrders} />
                <MetricCard
                  label="Awaiting confirmation"
                  value={operationsQuery.data.metrics.awaitingConfirmation}
                />
                <MetricCard
                  label="Unreachable"
                  value={operationsQuery.data.metrics.unreachableOrders}
                />
                <MetricCard
                  label="Scheduled today"
                  value={operationsQuery.data.metrics.scheduledToday}
                />
                <MetricCard
                  label="Dispatched today"
                  value={operationsQuery.data.metrics.dispatchedToday}
                />
                <MetricCard
                  label="Failed delivery"
                  value={operationsQuery.data.metrics.failedDeliveries}
                />
              </div>
              <div className="dashboard-queues">
                <Queue
                  title="Newest unhandled orders"
                  empty="No new orders require attention."
                  items={operationsQuery.data.newestUnhandled.map((item) => ({
                    ...item,
                    detail: new Intl.DateTimeFormat('en-NG', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(item.createdAt)),
                  }))}
                />
                <Queue
                  title="Overdue confirmation"
                  empty="No orders have waited more than 24 hours."
                  items={operationsQuery.data.overdueConfirmation.map((item) => ({
                    ...item,
                    detail: item.status.replaceAll('_', ' '),
                  }))}
                />
                <Queue
                  title="Today's deliveries"
                  empty="No deliveries are scheduled for this date."
                  items={operationsQuery.data.todayDeliveries.map((item) => ({
                    ...item,
                    detail: `${item.deliveryStatus.replaceAll('_', ' ')} · ${item.area}, ${item.state}`,
                  }))}
                />
                <Queue
                  title="Failed deliveries"
                  empty="No failed deliveries require action."
                  items={operationsQuery.data.failedDeliveryQueue.map((item) => ({
                    ...item,
                    detail: item.failureReasonCode?.replaceAll('_', ' ') ?? 'Review failure',
                  }))}
                />
              </div>
            </>
          )}
        </section>
      )}

      {canReadExecutive && (
        <section
          className="dashboard-section executive-dashboard"
          aria-labelledby="executive-title"
        >
          <div className="dashboard-section-heading">
            <div>
              <p className="eyebrow">Executive</p>
              <h2 id="executive-title">Business performance</h2>
            </div>
            <form
              className="dashboard-date-range"
              onSubmit={(event) => {
                event.preventDefault()
                setExecutiveRange(draftRange)
              }}
            >
              <label>
                From
                <input
                  type="date"
                  value={draftRange.from}
                  onChange={(event) =>
                    setDraftRange((current) => ({ ...current, from: event.target.value }))
                  }
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={draftRange.to}
                  onChange={(event) =>
                    setDraftRange((current) => ({ ...current, to: event.target.value }))
                  }
                />
              </label>
              <button className="secondary-action" disabled={draftRange.from > draftRange.to}>
                Apply period
              </button>
            </form>
          </div>

          {executiveQuery.isPending && (
            <div className="workspace-state">Loading performance...</div>
          )}
          {executiveQuery.isError && (
            <div className="form-error">The Executive dashboard could not be loaded.</div>
          )}
          {executiveQuery.data && (
            <>
              <div className="dashboard-metrics executive-metrics">
                <MetricCard label="Submitted" value={executiveQuery.data.metrics.submittedOrders} />
                <MetricCard label="Confirmed" value={executiveQuery.data.metrics.confirmedOrders} />
                <MetricCard label="Delivered" value={executiveQuery.data.metrics.deliveredOrders} />
                <MetricCard label="Completed" value={executiveQuery.data.metrics.completedOrders} />
                <MetricCard label="Paid" value={executiveQuery.data.metrics.paidOrders} />
                <MetricCard
                  label="Submitted value"
                  value={formatMoney(
                    executiveQuery.data.metrics.submittedValue,
                    executiveQuery.data.currency,
                  )}
                />
                <MetricCard
                  label="Delivered value"
                  value={formatMoney(
                    executiveQuery.data.metrics.deliveredRevenue,
                    executiveQuery.data.currency,
                  )}
                />
                <MetricCard
                  label="Paid revenue"
                  value={formatMoney(
                    executiveQuery.data.metrics.paidRevenue,
                    executiveQuery.data.currency,
                  )}
                />
              </div>

              <div className="funnel-grid">
                <MetricCard
                  label="Confirmation conversion"
                  value={`${executiveQuery.data.metrics.confirmationConversion}%`}
                />
                <MetricCard
                  label="Delivery conversion"
                  value={`${executiveQuery.data.metrics.deliveryConversion}%`}
                />
                <MetricCard
                  label="Paid conversion"
                  value={`${executiveQuery.data.metrics.paidConversion}%`}
                />
                <MetricCard
                  label="COD success"
                  value={`${executiveQuery.data.metrics.codSuccessRate}%`}
                />
                <MetricCard
                  label="Cancellation rate"
                  value={`${executiveQuery.data.metrics.cancellationRate}%`}
                />
                <MetricCard
                  label="Failed delivery rate"
                  value={`${executiveQuery.data.metrics.failedDeliveryRate}%`}
                />
              </div>

              <article className="workspace-card">
                <p className="eyebrow">Attribution</p>
                <h2>Performance by source</h2>
                {executiveQuery.data.sourceBreakdown.length === 0 ? (
                  <p>No orders were submitted in this period.</p>
                ) : (
                  <div className="orders-table-wrap">
                    <table className="orders-table">
                      <thead>
                        <tr>
                          <th>Source</th>
                          <th>Submitted</th>
                          <th>Delivered</th>
                          <th>Paid</th>
                          <th>Submitted value</th>
                          <th>Paid revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {executiveQuery.data.sourceBreakdown.map((source) => (
                          <tr key={source.source}>
                            <td>{source.source.replaceAll('_', ' ')}</td>
                            <td>{source.submittedOrders}</td>
                            <td>{source.deliveredOrders}</td>
                            <td>{source.paidOrders}</td>
                            <td>
                              {formatMoney(source.submittedValue, executiveQuery.data.currency)}
                            </td>
                            <td>{formatMoney(source.paidRevenue, executiveQuery.data.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            </>
          )}
        </section>
      )}
    </section>
  )
}
