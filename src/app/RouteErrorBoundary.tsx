import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

export function RouteErrorBoundary() {
  const error = useRouteError()
  const isNotFound = isRouteErrorResponse(error) && error.status === 404

  return (
    <main className="route-state" role="alert">
      <p className="eyebrow">{isNotFound ? 'Page not found' : 'Something went wrong'}</p>
      <h1>{isNotFound ? 'We could not find that page.' : 'This page could not be loaded.'}</h1>
      <p>
        {isNotFound
          ? 'Check the address or return to your workspace.'
          : 'Refresh the page. If the problem continues, contact an Executive Admin.'}
      </p>
      <a className="secondary-action" href="/">
        Return home
      </a>
    </main>
  )
}
