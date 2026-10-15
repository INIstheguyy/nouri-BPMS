import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '../../features/auth/useAuth'

const navigation = [
  { to: '/dashboard', label: 'Dashboard', permission: 'dashboard.operations.read' },
  { to: '/orders', label: 'Orders', permission: 'order.read' },
  { to: '/customers', label: 'Customers', permission: 'customer.read' },
  { to: '/analytics', label: 'Analytics', permission: 'analytics.read' },
  { to: '/staff', label: 'Staff', permission: 'staff.read' },
  { to: '/settings', label: 'Settings', permission: 'settings.read' },
]

export function AppShell() {
  const auth = useAuth()

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

        <nav aria-label="Primary navigation">
          {navigation
            .filter((item) => auth.hasPermission(item.permission))
            .map((item) => (
              <NavLink
                key={item.to}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
        </nav>

        <div className="account-actions">
          <span className="account-name">{auth.access?.fullName}</span>
          {auth.hasPermission('order.create') && (
            <NavLink className="primary-action" to="/orders/new">
              Create order
            </NavLink>
          )}
          <button className="sign-out-action" type="button" onClick={() => void auth.signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <main className="page-content">
        <Outlet />
      </main>
    </div>
  )
}
