import { AnimatePresence, motion } from 'framer-motion'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'

/* eslint-disable react-refresh/only-export-components -- Provider, host, and hook share one private context. */

interface ToastOptions {
  duration?: number
  undo?: () => void
}

interface ToastItem extends ToastOptions {
  id: number
  message: string
}

interface ToastContextValue {
  dismiss: (id: number) => void
  show: (message: string, options?: ToastOptions) => number
  toasts: ToastItem[]
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = ++nextId.current
      const item: ToastItem = { id, message, ...options }
      setToasts((current) => [...current, item])
      const duration = options.duration ?? 5_000
      if (duration > 0)
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        )
      return id
    },
    [dismiss],
  )

  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer))
      timers.current.clear()
    },
    [],
  )

  return <ToastContext.Provider value={{ dismiss, show, toasts }}>{children}</ToastContext.Provider>
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context.show
}

export function ToastHost() {
  const context = useContext(ToastContext)
  if (!context) return null

  return (
    <div
      aria-atomic="false"
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-[calc(var(--nav-h)+16px)] left-4 z-[100] grid justify-items-center gap-2 sm:right-6 sm:bottom-6 sm:left-auto sm:w-[360px]"
    >
      <AnimatePresence initial={false}>
        {context.toasts.map((toast) => (
          <motion.div
            className="pointer-events-auto flex w-full items-center gap-3 rounded-2xl border border-line bg-ink px-4 py-3 text-sm text-bg shadow-[0_18px_50px_rgb(0_0_0/0.22)]"
            exit={{ opacity: 0, y: 12 }}
            initial={{ opacity: 0, y: 20 }}
            key={toast.id}
            layout
            role="status"
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="min-w-0 flex-1 font-semibold">{toast.message}</span>
            {toast.undo && (
              <button
                className="rounded-full px-2 py-1 font-black text-gold"
                type="button"
                onClick={() => {
                  toast.undo?.()
                  context.dismiss(toast.id)
                }}
              >
                Undo
              </button>
            )}
            <button
              aria-label="Dismiss notification"
              className="grid size-7 shrink-0 place-items-center rounded-full text-lg text-bg/70"
              type="button"
              onClick={() => context.dismiss(toast.id)}
            >
              ×
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
