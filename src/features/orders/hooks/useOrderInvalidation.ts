import { useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '../../../shared/lib/query-keys'

/** Keeps order-related caches coherent after an operational command succeeds. */
export function useOrderInvalidation() {
  const queryClient = useQueryClient()

  async function invalidateOrder(orderId: string, options?: { deliveryAttention?: boolean }) {
    const invalidations = [
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() }),
    ]

    if (options?.deliveryAttention) {
      invalidations.push(queryClient.invalidateQueries({ queryKey: queryKeys.delivery.all() }))
    }

    await Promise.all(invalidations)
  }

  return { invalidateOrder }
}
