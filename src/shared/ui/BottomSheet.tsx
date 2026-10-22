import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  const titleId = useId()

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            aria-hidden="true"
            className="fixed inset-0 z-[80] bg-[#07110c]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            aria-labelledby={title ? titleId : undefined}
            aria-modal="true"
            className="fixed right-0 bottom-0 left-0 z-[81] mx-auto max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-surface p-5 text-ink shadow-[0_-24px_80px_rgb(0_0_0/0.25)] sm:p-7"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            role="dialog"
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-line" />
            <div className="mb-5 flex items-start justify-between gap-4">
              {title && (
                <h2
                  className="m-0 font-display text-[length:var(--display-md)] font-bold"
                  id={titleId}
                >
                  {title}
                </h2>
              )}
              <button
                aria-label="Close"
                className="ml-auto grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-xl text-ink"
                type="button"
                onClick={onClose}
              >
                ×
              </button>
            </div>
            {children}
          </motion.section>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
