import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.25.76'

import { errorResponse, HttpError, jsonResponse } from '../_shared/http.ts'
import { getMockWebhookSecret } from '../_shared/payments.ts'

const eventSchema = z.object({
  id: z.string().trim().min(3).max(200),
  reference: z.string().trim().min(3).max(200),
  type: z.enum(['payment.succeeded', 'payment.failed']),
  amount: z.number().int().nonnegative(),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase()),
})

function requiredEnvironment(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing Edge Function environment variable: ${name}`)
  return value
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hmacSha256(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(body)))
}

async function sha256(body: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body)))
}

function signaturesMatch(expected: string, supplied: string): boolean {
  if (expected.length !== supplied.length) return false
  let difference = 0
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ supplied.charCodeAt(index)
  }
  return difference === 0
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return errorResponse(new HttpError(405, 'METHOD_NOT_ALLOWED', 'Only POST is supported.'), {})
  }

  try {
    const body = await request.text()
    const suppliedSignature = request.headers.get('x-mock-signature')?.trim().toLowerCase() ?? ''
    const expectedSignature = await hmacSha256(getMockWebhookSecret(), body)
    if (!signaturesMatch(expectedSignature, suppliedSignature)) {
      throw new HttpError(401, 'INVALID_SIGNATURE', 'The webhook signature is invalid.')
    }

    let decoded: unknown
    try {
      decoded = JSON.parse(body)
    } catch {
      throw new HttpError(400, 'INVALID_JSON', 'The webhook body must be valid JSON.')
    }
    const parsed = eventSchema.safeParse(decoded)
    if (!parsed.success) {
      throw new HttpError(422, 'INVALID_EVENT', 'The webhook event is invalid.')
    }

    const adminClient = createClient(
      requiredEnvironment('SUPABASE_URL'),
      requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    const { data, error } = await adminClient.rpc('record_provider_payment_event', {
      provider_name: 'mock',
      provider_event_id: parsed.data.id,
      target_provider_reference: parsed.data.reference,
      provider_event_type: parsed.data.type,
      reported_amount: parsed.data.amount,
      reported_currency: parsed.data.currency,
      request_payload_hash: await sha256(body),
    })
    if (error) {
      if (error.message.includes('Payment not found')) {
        throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'No payment matches this provider reference.')
      }
      if (error.message.includes('does not match')) {
        throw new HttpError(
          422,
          'PAYMENT_MISMATCH',
          'The payment amount or currency does not match.',
        )
      }
      if (error.message.includes('reused with different data')) {
        throw new HttpError(409, 'EVENT_CONFLICT', 'The event id was already used for other data.')
      }
      throw error
    }

    const result = data?.[0]
    if (!result) throw new Error('Payment event returned no result.')
    return jsonResponse(
      {
        data: {
          orderId: result.order_id,
          paymentStatus: result.payment_status,
          replayed: result.replayed,
        },
      },
      200,
      {},
    )
  } catch (error) {
    return errorResponse(error, {})
  }
})
