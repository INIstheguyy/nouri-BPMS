import { motion } from 'framer-motion'

import type { OrderTone } from '../../features/orders/hooks/useOrderInfo'

const strokeByTone: Record<OrderTone, string> = {
  ok: 'stroke-ok',
  warn: 'stroke-warn',
  crit: 'stroke-crit',
  neutral: 'stroke-ink-2',
}

export function SlaRing({
  pct,
  size,
  tone,
  pulse = false,
  label,
}: {
  pct: number
  size: number
  tone: OrderTone
  pulse?: boolean
  label?: string
}) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(1, Math.max(0, pct))

  return (
    <motion.svg
      className="shrink-0"
      height={size}
      viewBox="0 0 100 100"
      width={size}
      {...(label ? { 'aria-label': label, role: 'img' as const } : {})}
      {...(pulse
        ? {
            animate: { scale: [1, 1.08, 1] },
            transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' as const },
          }
        : {})}
    >
      <circle className="stroke-white/20" cx="50" cy="50" fill="none" r={radius} strokeWidth="8" />
      <circle
        className={strokeByTone[tone]}
        cx="50"
        cy="50"
        fill="none"
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        strokeLinecap="round"
        strokeWidth="8"
        transform="rotate(-90 50 50)"
      />
    </motion.svg>
  )
}
