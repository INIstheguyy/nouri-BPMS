/* eslint-disable react-refresh/only-export-components -- Route module owns lazy route factories. */
import { lazy, Suspense, type ComponentType } from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'

import { RouteErrorBoundary } from './RouteErrorBoundary'
import { AppShell } from './shell/AppShell'
import { AuthLayout } from '../features/auth/AuthLayout'
import { PermissionRoute, ProtectedRoute, PublicOnlyRoute } from '../features/auth/AuthGuards'

const LoginPage = lazy(() =>
  import('../features/auth/LoginPage').then(({ LoginPage }) => ({ default: LoginPage })),
)
const ForgotPasswordPage = lazy(() =>
  import('../features/auth/ForgotPasswordPage').then(({ ForgotPasswordPage }) => ({
    default: ForgotPasswordPage,
  })),
)
const SetPasswordPage = lazy(() =>
  import('../features/auth/SetPasswordPage').then(({ SetPasswordPage }) => ({
    default: SetPasswordPage,
  })),
)
const CustomerDetailPage = lazy(() =>
  import('../features/customers/CustomerDetailPage').then(({ CustomerDetailPage }) => ({
    default: CustomerDetailPage,
  })),
)
const AnalyticsPage = lazy(() =>
  import('../features/analytics/AnalyticsPage').then(({ AnalyticsPage }) => ({
    default: AnalyticsPage,
  })),
)
const CustomersPage = lazy(() =>
  import('../features/customers/CustomersPage').then(({ CustomersPage }) => ({
    default: CustomersPage,
  })),
)
const DashboardPage = lazy(() =>
  import('../features/dashboard/DashboardPage').then(({ DashboardPage }) => ({
    default: DashboardPage,
  })),
)
const NotFoundPage = lazy(() =>
  import('../features/foundation/NotFoundPage').then(({ NotFoundPage }) => ({
    default: NotFoundPage,
  })),
)
const ManualOrderPage = lazy(() =>
  import('../features/orders/ManualOrderPage').then(({ ManualOrderPage }) => ({
    default: ManualOrderPage,
  })),
)
const OrderDetailPage = lazy(() =>
  import('../features/orders/OrderDetailPage').then(({ OrderDetailPage }) => ({
    default: OrderDetailPage,
  })),
)
const OrdersPage = lazy(() =>
  import('../features/orders/OrdersPage').then(({ OrdersPage }) => ({ default: OrdersPage })),
)
const PublicOrderPage = lazy(() =>
  import('../features/public-order/PublicOrderPage').then(({ PublicOrderPage }) => ({
    default: PublicOrderPage,
  })),
)
const SettingsPage = lazy(() =>
  import('../features/settings/SettingsPage').then(({ SettingsPage }) => ({
    default: SettingsPage,
  })),
)
const StaffPage = lazy(() =>
  import('../features/staff/StaffPage').then(({ StaffPage }) => ({ default: StaffPage })),
)

function lazyRoute(Component: ComponentType) {
  return (
    <Suspense fallback={<div className="route-state">Loading page...</div>}>
      <Component />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  { path: '/order', element: lazyRoute(PublicOrderPage), errorElement: <RouteErrorBoundary /> },
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: '/login', element: lazyRoute(LoginPage) },
          { path: '/forgot-password', element: lazyRoute(ForgotPasswordPage) },
        ],
      },
      { path: '/reset-password', element: lazyRoute(() => <SetPasswordPage mode="recovery" />) },
      { path: '/invite', element: lazyRoute(() => <SetPasswordPage mode="invite" />) },
      { path: '/invite/:token', element: lazyRoute(() => <SetPasswordPage mode="invite" />) },
    ],
  },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: lazyRoute(DashboardPage) },
          { path: 'orders', element: lazyRoute(OrdersPage) },
          { path: 'orders/new', element: lazyRoute(ManualOrderPage) },
          { path: 'orders/:orderId', element: lazyRoute(OrderDetailPage) },
          { path: 'customers', element: lazyRoute(CustomersPage) },
          { path: 'customers/:customerId', element: lazyRoute(CustomerDetailPage) },
          {
            path: 'analytics',
            element: (
              <PermissionRoute permission="analytics.read">
                {lazyRoute(AnalyticsPage)}
              </PermissionRoute>
            ),
          },
          {
            path: 'staff',
            element: (
              <PermissionRoute permission="staff.read">{lazyRoute(StaffPage)}</PermissionRoute>
            ),
          },
          {
            path: 'settings',
            element: (
              <PermissionRoute permission="settings.read">
                {lazyRoute(SettingsPage)}
              </PermissionRoute>
            ),
          },
          { path: '*', element: lazyRoute(NotFoundPage) },
        ],
      },
    ],
  },
])
