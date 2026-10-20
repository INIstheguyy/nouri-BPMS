import { useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../../features/auth/useAuth'
import { useIsCompactNavigation } from '../../shared/hooks/useIsMobileView'

type NavigationIconName =
  'dashboard' | 'orders' | 'customers' | 'analytics' | 'staff' | 'settings' | 'more' | 'logout'

const navigation = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    permission: 'dashboard.operations.read',
    icon: 'dashboard',
  },
  { to: '/orders', label: 'Orders', permission: 'order.read', icon: 'orders' },
  { to: '/customers', label: 'Customers', permission: 'customer.read', icon: 'customers' },
  { to: '/analytics', label: 'Analytics', permission: 'analytics.read', icon: 'analytics' },
  { to: '/staff', label: 'Staff', permission: 'staff.read', icon: 'staff' },
  { to: '/settings', label: 'Settings', permission: 'settings.read', icon: 'settings' },
] as const satisfies ReadonlyArray<{
  to: string
  label: string
  permission: string
  icon: NavigationIconName
}>

function NavigationIcon({ name }: { name: NavigationIconName }) {
  const paths: Record<NavigationIconName, ReactNode> = {
    dashboard: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
    orders: <path d="M8 4h8l2 3v13H6V7zm0 5h8M8 13h8M8 17h5" />,
    customers: (
      <path d="M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m13-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6m5 9v-2a4 4 0 0 0-3-3.87M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
    ),
    analytics: <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />,
    staff: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m-7 8a7 7 0 0 1 14 0" />,
    settings: (
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-11.5v2m0 12v2m8-8h-2M6 12H4m13.66-5.66-1.42 1.42M7.76 16.24l-1.42 1.42m11.32 0-1.42-1.42M7.76 7.76 6.34 6.34" />
    ),
    more: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
    logout: <path d="M10 17l5-5-5-5m5 5H3m9-8h6v16h-6" />,
  }

  return (
    <svg aria-hidden="true" className="bottom-nav-icon" viewBox="0 0 24 24" fill="none">
      {paths[name]}
    </svg>
  )
}

export function AppShell() {
  const auth = useAuth()
  const location = useLocation()
  const isCompactNavigation = useIsCompactNavigation()
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const allowedNavigation = navigation.filter((item) => auth.hasPermission(item.permission))
  const primaryMobileNavigation = allowedNavigation.slice(0, 3)
  const secondaryMobileNavigation = allowedNavigation.slice(3)
  const isSecondaryMobileRoute = secondaryMobileNavigation.some((item) =>
    location.pathname.startsWith(item.to),
  )

  return (
    <div className="app-frame">
      <header className="topbar">
        <NavLink className="brand" to="/" aria-label="Nouri Operations home">
          <span className="brand-mark">N</span>
          <span>
            <strong>Nouri</strong>
            <small>Operations</small>
          </span>
        </NavLink>

        {!isCompactNavigation && (
          <nav aria-label="Primary navigation">
            {allowedNavigation.map((item) => (
              <NavLink
                key={item.to}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="account-actions">
          <span className="account-name">{auth.access?.fullName}</span>
          {auth.hasPermission('order.create') && (
            <NavLink
              aria-label="Create order"
              className="header-icon-action create-order-action"
              title="Create order"
              to="/orders/new"
            >
              <NavigationIcon name="orders" />
            </NavLink>
          )}
          <button
            aria-label="Sign out"
            className="header-icon-action sign-out-action"
            title="Sign out"
            type="button"
            onClick={() => void auth.signOut()}
          >
            <NavigationIcon name="logout" />
          </button>
        </div>
      </header>

      <main className="page-content">
        <Outlet />
      </main>

      {isCompactNavigation && (
        <>
          {secondaryMobileNavigation.length > 0 && isMoreOpen && (
            <nav className="mobile-more-menu" aria-label="More navigation">
              {secondaryMobileNavigation.map((item) => (
                <NavLink
                  key={item.to}
                  className={({ isActive }) =>
                    isActive ? 'mobile-more-link active' : 'mobile-more-link'
                  }
                  to={item.to}
                  onClick={() => setIsMoreOpen(false)}
                >
                  <NavigationIcon name={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          )}
          <nav className="bottom-navigation" aria-label="Mobile navigation">
            {primaryMobileNavigation.map((item) => (
              <NavLink
                key={item.to}
                className={({ isActive }) =>
                  isActive ? 'bottom-nav-link active' : 'bottom-nav-link'
                }
                to={item.to}
              >
                <NavigationIcon name={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            ))}
            {secondaryMobileNavigation.length > 0 && (
              <button
                aria-expanded={isMoreOpen}
                aria-label="More navigation"
                className={
                  isMoreOpen || isSecondaryMobileRoute
                    ? 'bottom-nav-link bottom-nav-more active'
                    : 'bottom-nav-link bottom-nav-more'
                }
                type="button"
                onClick={() => setIsMoreOpen((isOpen) => !isOpen)}
              >
                <NavigationIcon name="more" />
                <span>More</span>
              </button>
            )}
          </nav>
        </>
      )}
    </div>
  )
}
