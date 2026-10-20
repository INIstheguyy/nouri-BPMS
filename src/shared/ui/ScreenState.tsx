import type { ReactNode } from 'react'

interface ScreenStateProps {
  children: ReactNode
}

export function LoadingState({ children }: ScreenStateProps) {
  return (
    <div className="workspace-state" role="status">
      {children}
    </div>
  )
}

export function EmptyState({ children }: ScreenStateProps) {
  return <div className="workspace-state">{children}</div>
}

export function ErrorState({ children }: ScreenStateProps) {
  return (
    <div className="form-error" role="alert">
      {children}
    </div>
  )
}
