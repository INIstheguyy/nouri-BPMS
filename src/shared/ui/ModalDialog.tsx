import { useEffect, type ReactNode } from 'react'

interface ModalDialogProps {
  children: ReactNode
  labelledBy: string
  onClose: () => void
}

/** Shared modal frame for focused operational commands. */
export function ModalDialog({ children, labelledBy, onClose }: ModalDialogProps) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="workflow-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="workflow-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </section>
    </div>
  )
}
