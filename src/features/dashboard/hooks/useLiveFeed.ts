import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { supabase } from '../../../lib/supabase/client'
import { queryKeys } from '../../../shared/lib/query-keys'
import { getRecentOrderEvents } from '../api'

export function useLiveFeed(enabled = true) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: queryKeys.dashboard.feed(),
    queryFn: getRecentOrderEvents,
    enabled,
  })

  useEffect(() => {
    if (!enabled) return
    const channel = supabase
      .channel('dashboard-order-events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_events' }, () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.feed() })
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() })
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [enabled, queryClient])

  return query
}
