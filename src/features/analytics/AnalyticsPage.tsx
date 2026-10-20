import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { getExecutiveDashboard } from '../dashboard/api'
import { formatMoney } from '../../shared/lib/money'
import { queryKeys } from '../../shared/lib/query-keys'
import { useIsMobileView } from '../../shared/hooks/useIsMobileView'
import { PageHeader } from '../../shared/ui/PageHeader'
import { ResponsiveDataList } from '../../shared/ui/ResponsiveDataList'
import { ErrorState, LoadingState } from '../../shared/ui/ScreenState'

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

export function AnalyticsPage() {
  const isMobile = useIsMobileView()
  const [range, setRange] = useState({ from: firstDayOfMonth(), to: localDate() })
  const [draftRange, setDraftRange] = useState(range)
  const executiveQuery = useQuery({
    queryKey: queryKeys.dashboard.executive(range),
    queryFn: () => getExecutiveDashboard(range.from, range.to),
  })

  return (
    <section className="analytics-page dashboard-page">
      <PageHeader
        eyebrow="Executive reporting"
        title="Analytics"
        description="Conversion, revenue, and acquisition performance for the selected period."
      />

      <section className="dashboard-section executive-dashboard" aria-labelledby="executive-title">
        <div className="dashboard-section-heading">
          <div>
            <p className="eyebrow">Performance</p>
            <h2 id="executive-title">Business performance</h2>
          </div>
          <form
            className="dashboard-date-range"
            onSubmit={(event) => {
              event.preventDefault()
              setRange(draftRange)
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

        {executiveQuery.isPending && <LoadingState>Loading performance...</LoadingState>}
        {executiveQuery.isError && (
          <ErrorState>The executive dashboard could not be loaded.</ErrorState>
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
                label="Paid revenue"
                value={formatMoney(
                  executiveQuery.data.metrics.paidRevenue,
                  executiveQuery.data.currency,
                )}
              />
            </div>
            <div className="funnel-grid">
              <MetricCard
                label="Confirmation rate"
                value={`${executiveQuery.data.metrics.confirmationConversion}%`}
              />
              <MetricCard
                label="Delivery rate"
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
              <p className="eyebrow">Acquisition</p>
              <h2>Performance by source</h2>
              {executiveQuery.data.sourceBreakdown.length === 0 ? (
                <p>No orders were submitted in this period.</p>
              ) : (
                <>
                  <div className="orders-table-wrap" hidden={isMobile}>
                    <table className="orders-table">
                      <thead>
                        <tr>
                          <th>Source</th>
                          <th>Submitted</th>
                          <th>Delivered</th>
                          <th>Paid</th>
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
                            <td>{formatMoney(source.paidRevenue, executiveQuery.data.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {isMobile && (
                    <ResponsiveDataList
                      ariaLabel="Performance by source"
                      items={executiveQuery.data.sourceBreakdown.map((source) => ({
                        id: source.source,
                        title: source.source.replaceAll('_', ' '),
                        fields: [
                          { label: 'Submitted', value: source.submittedOrders },
                          { label: 'Delivered', value: source.deliveredOrders },
                          { label: 'Paid', value: source.paidOrders },
                          {
                            label: 'Paid revenue',
                            value: formatMoney(source.paidRevenue, executiveQuery.data.currency),
                          },
                        ],
                      }))}
                    />
                  )}
                </>
              )}
            </article>
          </>
        )}
      </section>
    </section>
  )
}
