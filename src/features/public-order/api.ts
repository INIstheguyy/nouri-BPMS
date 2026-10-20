import { supabase } from '../../lib/supabase/client'
export { listActiveOffers, type PublicOffer } from '../catalogue/api'

export interface PublicOrderPayload {
  customer: {
    name: string
    whatsapp: string
    alternativePhone?: string | undefined
    email?: string | undefined
  }
  offerId: string
  paymentMethod: 'COD'
  delivery: {
    state: string
    city?: string | undefined
    area: string
    addressLine: string
    landmark?: string | undefined
  }
  attribution: {
    source: 'LANDING_PAGE' | 'WEBSITE' | 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK' | 'AFFILIATE' | 'OTHER'
    sourceDetail?: string | undefined
    utmSource?: string | undefined
    medium?: string | undefined
    campaign?: string | undefined
    content?: string | undefined
    term?: string | undefined
    landingPage?: string | undefined
    referrer?: string | undefined
    gclid?: string | undefined
    fbclid?: string | undefined
    ttclid?: string | undefined
  }
  customerNote?: string | undefined
}

export interface PublicOrderResult {
  orderNumber: string
  nextStepMessage: string
}

export async function createPublicOrder(
  payload: PublicOrderPayload,
  idempotencyKey: string,
): Promise<PublicOrderResult> {
  const response = await supabase.functions.invoke<{
    data?: PublicOrderResult
    error?: { message?: string }
  }>('create-public-order', {
    body: payload,
    headers: { 'x-idempotency-key': idempotencyKey },
  })

  if (response.error) throw new Error('The order request failed.')
  if (!response.data?.data) {
    throw new Error(response.data?.error?.message ?? 'The order could not be created.')
  }
  return response.data.data
}
