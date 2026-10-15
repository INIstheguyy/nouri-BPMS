import { z } from 'npm:zod@3.25.76'

import { authorize } from '../_shared/auth.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { errorResponse, HttpError, jsonResponse } from '../_shared/http.ts'
import { getPaymentProvider } from '../_shared/payments.ts'

const requestSchema = z.object({ orderId: z.string().uuid() })

Deno.serve(async (request) => {
  const corsHeaders = getCorsHeaders(request)
  if (!corsHeaders) {
    return errorResponse(new HttpError(403, 'ORIGIN_FORBIDDEN', 'This origin is not allowed.'), {})
  }
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (request.method !== 'POST') {
    return errorResponse(
      new HttpError(405, 'METHOD_NOT_ALLOWED', 'Only POST requests are supported.'),
      corsHeaders,
    )
  }

  try {
    const { actor, adminClient } = await authorize(request, 'payment.update')
    let body: unknown
    try {
      body = await request.json()
    } catch {
      throw new HttpError(400, 'INVALID_JSON', 'The request body must be valid JSON.')
    }
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      throw new HttpError(422, 'VALIDATION_FAILED', 'A valid order id is required.')
    }

    const initialization = getPaymentProvider().initialize(parsed.data.orderId)
    const { data, error } = await adminClient.rpc('initialize_prepaid_payment', {
      target_order_id: parsed.data.orderId,
      target_provider: initialization.provider,
      target_reference: initialization.reference,
      actor_user_id: actor.id,
    })
    if (error) {
      if (error.message.includes('not pending') || error.message.includes('Only prepaid')) {
        throw new HttpError(409, 'PAYMENT_NOT_INITIALIZABLE', error.message)
      }
      if (error.message.includes('Payment not found')) {
        throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.')
      }
      throw error
    }

    const result = data?.[0]
    if (!result) throw new Error('Payment initialization returned no result.')
    return jsonResponse(
      {
        data: {
          provider: result.provider,
          reference: result.provider_reference,
          amount: result.amount,
          currency: result.currency,
          alreadyInitialized: result.already_initialized,
          mode: initialization.mode,
        },
      },
      200,
      corsHeaders,
    )
  } catch (error) {
    return errorResponse(error, corsHeaders)
  }
})
