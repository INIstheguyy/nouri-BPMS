import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { NavLink, useLocation, useOutlet } from 'react-router-dom'

import { useAuth } from '../../features/auth/useAuth'
import { useIsCompactNavigation } from '../../shared/hooks/useIsMobileView'
import { ToastHost } from '../../shared/ui/Toast'
import { useNewOrderCount } from './useNewOrderCount'

type NavigationIconName =
  'home' | 'new' | 'orders' | 'people' | 'analytics' | 'staff' | 'more' | 'logout'

interface NavigationItem {
  to: string
  label: string
  icon: NavigationIconName
}

const managerNavigation: readonly NavigationItem[] = [
  { to: '/home', label: 'Home', icon: 'home' },
  { to: '/new', label: 'New', icon: 'new' },
  { to: '/orders', label: 'Orders', icon: 'orders' },
  { to: '/people', label: 'People', icon: 'people' },
]

const executiveNavigation: readonly NavigationItem[] = [
  { to: '/analytics', label: 'Analytics', icon: 'analytics' },
  { to: '/orders', label: 'Orders', icon: 'orders' },
  { to: '/staff', label: 'Staff', icon: 'staff' },
  { to: '/settings', label: 'More', icon: 'more' },
]

function NavigationIcon({ name }: { name: NavigationIconName }) {
  const paths: Record<NavigationIconName, ReactNode> = {
    home: <path d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10M9.5 20v-6h5v6" />,
    new: <path d="M12 5v14M5 12h14" />,
    orders: <path d="M8 4h8l2 3v13H6V7zm0 5h8M8 13h8M8 17h5" />,
    people: (
      <path d="M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m13-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6m5 9v-2a4 4 0 0 0-3-3.87M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
    ),
    analytics: <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />,
    staff: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m-7 8a7 7 0 0 1 14 0" />,
    more: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
    logout: <path d="M10 17l5-5-5-5m5 5H3m9-8h6v16h-6" />,
  }

  return (
    <svg aria-hidden="true" className="bottom-nav-icon" viewBox="0 0 24 24" fill="none">
      {paths[name]}
    </svg>
  )
}

function NavigationItems({
  items,
  mobile = false,
  newOrderCount = 0,
}: {
  items: readonly NavigationItem[]
  mobile?: boolean
  newOrderCount?: number
}) {
  return items.map((item) => (
    <NavLink
      aria-label={
        item.label === 'New' && newOrderCount > 0 ? `New, ${newOrderCount} new orders` : item.label
      }
      key={item.to}
      className={({ isActive }) => {
        const base = mobile ? 'bottom-nav-link' : 'nav-link'
        return isActive ? `${base} active` : base
      }}
      to={item.to}
    >
      {mobile && <NavigationIcon name={item.icon} />}
      <span className="relative">
        {item.label}
        {item.label === 'New' && newOrderCount > 0 && (
          <motion.span
            aria-hidden="true"
            className="absolute -top-2.5 -right-4 grid min-w-4 place-items-center rounded-full bg-crit px-1 text-[9px] leading-4 font-black text-white"
            initial={{ scale: 0.6 }}
            animate={{ scale: 1 }}
            key={newOrderCount}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          >
            {newOrderCount > 99 ? '99+' : newOrderCount}
          </motion.span>
        )}
      </span>
    </NavLink>
  ))
}

export function AppShell() {
  const auth = useAuth()
  const location = useLocation()
  const outlet = useOutlet()
  const isCompactNavigation = useIsCompactNavigation()
  const isExecutive = auth.access?.roles.includes('EXECUTIVE_ADMIN') ?? false
  const newOrderCount = useNewOrderCount(!isExecutive && auth.hasPermission('order.read'))
  const role = isExecutive ? 'exec' : 'manager'
  const navigation = isExecutive ? executiveNavigation : managerNavigation

  return (
    <div className="app-frame" data-role={role}>
      <header className="topbar">
        <NavLink className="brand" to="/" aria-label="Nouri Operations home">
          <span className="brand-mark">N</span>
          <span>
            <strong>Nouri</strong>
            <small>{isExecutive ? 'Executive' : 'Operations'}</small>
          </span>
        </NavLink>

        {!isCompactNavigation && (
          <nav aria-label="Primary navigation">
            <NavigationItems items={navigation} newOrderCount={newOrderCount} />
          </nav>
        )}

        <div className="account-actions">
          <span className="account-name">{auth.access?.fullName}</span>
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

      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={location.pathname}
          className="page-content"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {outlet}
        </motion.main>
      </AnimatePresence>

      {isCompactNavigation && (
        <nav className="bottom-navigation" aria-label="Mobile navigation">
          <NavigationItems items={navigation} mobile newOrderCount={newOrderCount} />
        </nav>
      )}
      <ToastHost />
    </div>
  )
}
