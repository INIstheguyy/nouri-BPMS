import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'
import { getOperationsDashboard } from './api'
import { queryKeys } from '../../shared/lib/query-keys'
import { PageHeader } from '../../shared/ui/PageHeader'
import { ErrorState, LoadingState } from '../../shared/ui/ScreenState'

function localDate(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function MetricCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string | number
  tone?: 'default' | 'attention' | 'warning'
}) {
  return (
    <article className={`summary-card dashboard-metric dashboard-metric-${tone}`}>
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
  const canReadOperations = auth.hasPermission('dashboard.operations.read')
  const operationsQuery = useQuery({
    queryKey: queryKeys.dashboard.operations(operationsDate),
    queryFn: () => getOperationsDashboard(operationsDate),
    enabled: canReadOperations,
  })

  return (
    <section className="dashboard-page">
      <PageHeader
        eyebrow="Today’s operations"
        title="Dashboard"
        description="Work that needs attention across orders and deliveries."
        actions={
          <Link className="secondary-action" to="/orders">
            Open orders
          </Link>
        }
      />

      {canReadOperations && (
        <section className="dashboard-section" aria-labelledby="operations-dashboard-title">
          <div className="dashboard-section-heading">
            <div>
              <p className="eyebrow">Priority queue</p>
              <h2 id="operations-dashboard-title">What needs attention</h2>
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

          {operationsQuery.isPending && <LoadingState>Loading operations...</LoadingState>}
          {operationsQuery.isError && (
            <ErrorState>The operations dashboard could not be loaded.</ErrorState>
          )}
          {operationsQuery.data && (
            <>
              <div className="dashboard-metrics">
                <MetricCard
                  label="New orders"
                  tone="attention"
                  value={operationsQuery.data.metrics.newOrders}
                />
                <MetricCard
                  label="Need follow-up"
                  tone="attention"
                  value={
                    operationsQuery.data.metrics.awaitingConfirmation +
                    operationsQuery.data.metrics.unreachableOrders
                  }
                />
                <MetricCard
                  label="Deliveries today"
                  value={
                    operationsQuery.data.metrics.scheduledToday +
                    operationsQuery.data.metrics.dispatchedToday
                  }
                />
                <MetricCard
                  label="Delivery failures"
                  tone="warning"
                  value={operationsQuery.data.metrics.failedDeliveries}
                />
              </div>
              <div className="dashboard-queues">
                <Queue
                  title="Order follow-up"
                  empty="No new or overdue orders require attention."
                  items={[
                    ...operationsQuery.data.newestUnhandled.map((item) => ({
                      ...item,
                      detail: `New · ${new Intl.DateTimeFormat('en-NG', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(item.createdAt))}`,
                    })),
                    ...operationsQuery.data.overdueConfirmation.map((item) => ({
                      ...item,
                      detail: `Follow up · ${item.status.replaceAll('_', ' ')}`,
                    })),
                  ]}
                />
                <Queue
                  title="Today’s deliveries"
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
    </section>
  )
}
