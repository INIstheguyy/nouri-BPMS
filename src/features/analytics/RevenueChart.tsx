import { useMemo, useRef, useState } from 'react'

import { formatMoney } from '../../shared/lib/money'
import type { RevenuePoint } from '../dashboard/api'

const WIDTH = 720
const HEIGHT = 250
const PAD_X = 20
const PAD_TOP = 24
const PAD_BOTTOM = 34

export function RevenueChart({ points, currency }: { points: RevenuePoint[]; currency: string }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const chart = useMemo(() => {
    const max = Math.max(...points.map((point) => point.revenue), 1)
    const innerWidth = WIDTH - PAD_X * 2
    const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM
    const coordinates = points.map((point, index) => ({
      ...point,
      x:
        PAD_X + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth),
      y: PAD_TOP + innerHeight * (1 - point.revenue / max),
    }))
    const line = coordinates.map((point) => `${point.x},${point.y}`).join(' ')
    const area = coordinates.length
      ? `M ${coordinates[0]!.x} ${HEIGHT - PAD_BOTTOM} L ${line.replaceAll(',', ' ')} L ${coordinates.at(-1)?.x ?? PAD_X} ${HEIGHT - PAD_BOTTOM} Z`
      : ''
    return { coordinates, line, area }
  }, [points])

  const active = activeIndex === null ? null : chart.coordinates[activeIndex]

  function selectPoint(clientX: number) {
    const bounds = svgRef.current?.getBoundingClientRect()
    if (!bounds || chart.coordinates.length === 0) return
    const x = ((clientX - bounds.left) / bounds.width) * WIDTH
    const nearest = chart.coordinates.reduce(
      (best, point, index) =>
        Math.abs(point.x - x) < best.distance ? { index, distance: Math.abs(point.x - x) } : best,
      { index: 0, distance: Number.POSITIVE_INFINITY },
    )
    setActiveIndex(nearest.index)
  }

  if (points.length === 0) return <p className="analytics-empty">No revenue in this period.</p>

  return (
    <svg
      ref={svgRef}
      aria-label="Paid revenue over time"
      className="revenue-chart"
      onPointerLeave={() => setActiveIndex(null)}
      onPointerMove={(event) => selectPoint(event.clientX)}
      role="img"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
    >
      <defs>
        <linearGradient id="revenue-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--gold)" stopOpacity="0.42" />
          <stop offset="1" stopColor="var(--gold)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((step) => (
        <line
          key={step}
          className="revenue-gridline"
          x1={PAD_X}
          x2={WIDTH - PAD_X}
          y1={PAD_TOP + (HEIGHT - PAD_TOP - PAD_BOTTOM) * step}
          y2={PAD_TOP + (HEIGHT - PAD_TOP - PAD_BOTTOM) * step}
        />
      ))}
      <path d={chart.area} fill="url(#revenue-area)" />
      <polyline className="revenue-line" fill="none" points={chart.line} />
      {active && (
        <g aria-hidden="true">
          <line
            className="revenue-crosshair"
            x1={active.x}
            x2={active.x}
            y1={PAD_TOP}
            y2={HEIGHT - PAD_BOTTOM}
          />
          <circle className="revenue-dot" cx={active.x} cy={active.y} r="6" />
          <g transform={`translate(${Math.min(Math.max(active.x - 76, 8), WIDTH - 160)} 4)`}>
            <rect className="revenue-tooltip" height="48" rx="10" width="152" />
            <text className="revenue-tooltip-value" x="12" y="21">
              {formatMoney(active.revenue, currency)}
            </text>
            <text className="revenue-tooltip-date" x="12" y="38">
              {new Date(`${active.date}T12:00:00`).toLocaleDateString('en-NG', {
                day: 'numeric',
                month: 'short',
              })}
            </text>
          </g>
        </g>
      )}
      <text className="revenue-axis-label" x={PAD_X} y={HEIGHT - 8}>
        {new Date(`${points[0]!.date}T12:00:00`).toLocaleDateString('en-NG', {
          day: 'numeric',
          month: 'short',
        })}
      </text>
      <text className="revenue-axis-label" textAnchor="end" x={WIDTH - PAD_X} y={HEIGHT - 8}>
        {new Date(`${points.at(-1)?.date}T12:00:00`).toLocaleDateString('en-NG', {
          day: 'numeric',
          month: 'short',
        })}
      </text>
    </svg>
  )
}
