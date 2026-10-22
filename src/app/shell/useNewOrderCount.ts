import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { listOrders } from '../../features/orders/api/orders'
import type { OrderFilters } from '../../features/orders/api/types'
import { supabase } from '../../lib/supabase/client'
import { queryKeys } from '../../shared/lib/query-keys'

const filters: OrderFilters = {
  search: '',
  queue: 'new',
  status: '',
  source: '',
  paymentMethod: '',
  from: '',
  to: '',
  page: 1,
  pageSize: 1,
}

export function useNewOrderCount(enabled: boolean) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => listOrders(filters),
    enabled,
  })

  useEffect(() => {
    if (!enabled) return
    const channel = supabase
      .channel('shell-new-order-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() })
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [enabled, queryClient])

  return query.data?.total ?? 0
}
