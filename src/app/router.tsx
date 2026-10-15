import { Navigate, createBrowserRouter } from 'react-router-dom'

import { AppShell } from './shell/AppShell'
import { AuthLayout } from '../features/auth/AuthLayout'
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage'
import { PermissionRoute, ProtectedRoute, PublicOnlyRoute } from '../features/auth/AuthGuards'
import { LoginPage } from '../features/auth/LoginPage'
import { SetPasswordPage } from '../features/auth/SetPasswordPage'
import { CustomerDetailPage } from '../features/customers/CustomerDetailPage'
import { CustomersPage } from '../features/customers/CustomersPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { PlaceholderPage } from '../features/foundation/PlaceholderPage'
import { ManualOrderPage } from '../features/orders/ManualOrderPage'
import { OrderDetailPage } from '../features/orders/OrderDetailPage'
import { OrdersPage } from '../features/orders/OrdersPage'
import { PublicOrderPage } from '../features/public-order/PublicOrderPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { StaffPage } from '../features/staff/StaffPage'

const placeholderRoutes = [{ path: 'analytics', title: 'Analytics' }] as const

export const router = createBrowserRouter([
  { path: '/order', element: <PublicOrderPage /> },
  {
    element: <AuthLayout />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
        ],
      },
      { path: '/reset-password', element: <SetPasswordPage mode="recovery" /> },
      { path: '/invite', element: <SetPasswordPage mode="invite" /> },
      { path: '/invite/:token', element: <SetPasswordPage mode="invite" /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'orders', element: <OrdersPage /> },
          { path: 'orders/new', element: <ManualOrderPage /> },
          { path: 'orders/:orderId', element: <OrderDetailPage /> },
          { path: 'customers', element: <CustomersPage /> },
          { path: 'customers/:customerId', element: <CustomerDetailPage /> },
          {
            path: 'staff',
            element: (
              <PermissionRoute permission="staff.read">
                <StaffPage />
              </PermissionRoute>
            ),
          },
          {
            path: 'settings',
            element: (
              <PermissionRoute permission="settings.read">
                <SettingsPage />
              </PermissionRoute>
            ),
          },
          ...placeholderRoutes.map((route) => ({
            path: route.path,
            element: <PlaceholderPage title={route.title} />,
          })),
          { path: '*', element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
])
