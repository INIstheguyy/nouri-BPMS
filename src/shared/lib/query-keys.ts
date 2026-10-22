export const queryKeys = {
  catalogue: {
    active: () => ['catalogue', 'active'] as const,
    configuration: () => ['catalogue', 'configuration'] as const,
  },
  customers: {
    all: () => ['customers'] as const,
    detail: (customerId: string) => ['customers', customerId] as const,
    list: (filters: unknown) => ['customers', filters] as const,
  },
  dashboard: {
    executive: (range: { from: string; to: string }) => ['executive-dashboard', range] as const,
    revenue: (range: { from: string; to: string }) => ['executive-revenue', range] as const,
    feed: () => ['dashboard-feed'] as const,
    operations: (date: string) => ['operations-dashboard', date] as const,
  },
  delivery: {
    all: () => ['delivery-attention'] as const,
    attention: (date: string) => ['delivery-attention', date] as const,
  },
  settings: {
    operational: () => ['operational-settings'] as const,
  },
  orders: {
    all: () => ['orders'] as const,
    detail: (orderId: string) => ['order', orderId] as const,
    list: (filters: unknown) => ['orders', filters] as const,
  },
  staff: {
    all: () => ['staff'] as const,
    list: (filters: unknown) => ['staff', filters] as const,
  },
} as const
