import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="route-state">
      <p className="eyebrow">Page not found</p>
      <h1>We could not find that page.</h1>
      <p>Check the address or return to your workspace.</p>
      <Link className="secondary-action" to="/dashboard">
        Return to dashboard
      </Link>
    </main>
  )
}
