import { supabase } from '../../../lib/supabase/client'

import type { PaymentStatus, PrepaidInitialization } from './types'

export async function markCodPaid(orderId: string, collectionNote: string): Promise<PaymentStatus> {
  const { data, error } = await supabase.rpc('mark_cod_paid', {
    target_order_id: orderId,
    collection_note: collectionNote,
  })
  if (error) throw error
  return data
}

export async function initializePrepaidPayment(orderId: string): Promise<PrepaidInitialization> {
  const response = await supabase.functions.invoke<{ data?: PrepaidInitialization }>(
    'initialize-prepaid-payment',
    { body: { orderId } },
  )
  if (response.error) throw response.error
  if (!response.data?.data) throw new Error('Payment initialization returned no result.')
  return response.data.data
}
