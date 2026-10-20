import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.25.76'

import { getSecretApiKey } from '../_shared/api-keys.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { errorResponse, HttpError, jsonResponse } from '../_shared/http.ts'
import { normalizeNigerianPhone } from '../_shared/phone.ts'

const optionalText = (maximum: number) => z.string().trim().max(maximum).nullish()
const orderSources = [
  'LANDING_PAGE',
  'WEBSITE',
  'WHATSAPP',
  'PHONE',
  'INSTAGRAM',
  'FACEBOOK',
  'TIKTOK',
  'AFFILIATE',
  'OTHER',
] as const
const phoneSchema = z
  .string()
  .trim()
  .min(10)
  .max(24)
  .transform((phone, context) => {
    try {
      return normalizeNigerianPhone(phone)
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid Nigerian mobile number.',
      })
      return z.NEVER
    }
  })

const publicOrderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(160),
    whatsapp: phoneSchema,
    alternativePhone: phoneSchema.nullish(),
    email: z.string().trim().email().max(254).nullish(),
  }),
  offerId: z.string().uuid(),
  paymentMethod: z.literal('COD'),
  delivery: z.object({
    state: z.string().trim().min(2).max(100),
    city: optionalText(100),
    area: z.string().trim().min(2).max(120),
    addressLine: z.string().trim().min(5).max(300),
    landmark: optionalText(200),
  }),
  attribution: z
    .object({
      source: z
        .preprocess(
          (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
          z.enum(orderSources),
        )
        .default('LANDING_PAGE'),
      sourceDetail: optionalText(160),
      utmSource: optionalText(160),
      medium: optionalText(160),
      campaign: optionalText(200),
      content: optionalText(200),
      term: optionalText(200),
      landingPage: optionalText(500),
      referrer: optionalText(500),
      gclid: optionalText(500),
      fbclid: optionalText(500),
      ttclid: optionalText(500),
    })
    .default({ source: 'LANDING_PAGE' }),
  customerNote: optionalText(500),
})

function requiredEnvironment(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing Edge Function environment variable: ${name}`)
  return value
}

function isLocalSupabase(supabaseUrl: string): boolean {
  const hostname = new URL(supabaseUrl).hostname
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === 'kong'
}

function getRateLimitSalt(supabaseUrl: string): string {
  const salt = Deno.env.get('RATE_LIMIT_SALT')
  if (salt && salt.length >= 32) return salt
  if (isLocalSupabase(supabaseUrl)) return 'nouri-local-development-rate-limit-salt'
  throw new HttpError(503, 'SERVICE_NOT_CONFIGURED', 'Order submission is not configured.')
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function splitName(fullName: string): { firstName: string; lastName: string | null } {
  const [firstName = '', ...remainingNames] = fullName.trim().split(/\s+/)
  const lastName = remainingNames.join(' ') || null

  if (firstName.length > 100 || (lastName?.length ?? 0) > 100) {
    throw new HttpError(422, 'VALIDATION_FAILED', 'The customer name is too long.')
  }

  return { firstName, lastName }
}

function getClickId(attribution: z.infer<typeof publicOrderSchema>['attribution']) {
  if (attribution.ttclid) return { type: 'TTCLID', value: attribution.ttclid }
  if (attribution.gclid) return { type: 'GCLID', value: attribution.gclid }
  if (attribution.fbclid) return { type: 'FBCLID', value: attribution.fbclid }
  return { type: null, value: null }
}

Deno.serve(async (request) => {
  const corsHeaders = getCorsHeaders(request)

  if (!corsHeaders) {
    return errorResponse(new HttpError(403, 'ORIGIN_FORBIDDEN', 'This origin is not allowed.'), {})
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return errorResponse(
      new HttpError(405, 'METHOD_NOT_ALLOWED', 'Only POST requests are supported.'),
      corsHeaders,
    )
  }

  try {
    const idempotencyKey = request.headers.get('x-idempotency-key')?.trim()
    if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 200) {
      throw new HttpError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'A valid idempotency key is required.')
    }

    const supabaseUrl = requiredEnvironment('SUPABASE_URL')
    const secretKey = getSecretApiKey()
    const adminClient = createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const clientAddress = forwardedFor || request.headers.get('cf-connecting-ip') || 'unknown'
    const rateLimitSalt = getRateLimitSalt(supabaseUrl)
    const hashedClientKey = await sha256(`${rateLimitSalt}:${clientAddress}`)
    const { data: rateLimitRows, error: rateLimitError } = await adminClient.rpc(
      'check_public_order_rate_limit',
      { hashed_client_key: hashedClientKey, maximum_requests: 6, window_seconds: 60 },
    )

    if (rateLimitError) throw rateLimitError
    const rateLimit = rateLimitRows?.[0]
    if (!rateLimit?.allowed) {
      return jsonResponse(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many order attempts. Please wait and try again.',
            fieldErrors: null,
          },
        },
        429,
        { ...corsHeaders, 'Retry-After': String(rateLimit?.retry_after_seconds ?? 60) },
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      throw new HttpError(400, 'INVALID_JSON', 'The request body must be valid JSON.')
    }

    const parsed = publicOrderSchema.safeParse(body)
    if (!parsed.success) {
      throw new HttpError(
        422,
        'VALIDATION_FAILED',
        'Check the order details and try again.',
        parsed.error.flatten().fieldErrors,
      )
    }

    const { firstName, lastName } = splitName(parsed.data.customer.name)
    const clickId = getClickId(parsed.data.attribution)
    const fingerprint = await sha256(JSON.stringify(parsed.data))
    const { data: orderRows, error: orderError } = await adminClient.rpc('create_public_order', {
      request_idempotency_key: idempotencyKey,
      request_fingerprint: fingerprint,
      customer_first_name: firstName,
      customer_last_name: lastName,
      customer_phone: parsed.data.customer.whatsapp,
      customer_alternative_phone: parsed.data.customer.alternativePhone ?? null,
      customer_email: parsed.data.customer.email ?? null,
      selected_offer_id: parsed.data.offerId,
      selected_payment_method: parsed.data.paymentMethod,
      delivery_state: parsed.data.delivery.state,
      delivery_city: parsed.data.delivery.city ?? null,
      delivery_area: parsed.data.delivery.area,
      delivery_address_line: parsed.data.delivery.addressLine,
      delivery_landmark: parsed.data.delivery.landmark ?? null,
      acquisition_source: parsed.data.attribution.source,
      acquisition_source_detail: parsed.data.attribution.sourceDetail ?? null,
      acquisition_campaign_name: parsed.data.attribution.campaign ?? null,
      acquisition_utm_source: parsed.data.attribution.utmSource ?? null,
      acquisition_utm_medium: parsed.data.attribution.medium ?? null,
      acquisition_utm_campaign: parsed.data.attribution.campaign ?? null,
      acquisition_utm_content: parsed.data.attribution.content ?? null,
      acquisition_utm_term: parsed.data.attribution.term ?? null,
      acquisition_landing_page: parsed.data.attribution.landingPage ?? null,
      acquisition_referrer: parsed.data.attribution.referrer ?? null,
      acquisition_click_id_type: clickId.type,
      acquisition_click_id_value: clickId.value,
      acquisition_metadata: {
        gclid: parsed.data.attribution.gclid ?? null,
        fbclid: parsed.data.attribution.fbclid ?? null,
        ttclid: parsed.data.attribution.ttclid ?? null,
      },
      submitted_customer_note: parsed.data.customerNote ?? null,
    })

    if (orderError) {
      if (orderError.message.includes('Offer is unavailable')) {
        throw new HttpError(422, 'OFFER_UNAVAILABLE', 'The selected package is unavailable.')
      }
      if (orderError.message.includes('Idempotency key was reused')) {
        throw new HttpError(
          409,
          'IDEMPOTENCY_CONFLICT',
          'This submission key was already used for another order.',
        )
      }
      if (orderError.message.includes('Invalid Nigerian mobile number')) {
        throw new HttpError(422, 'INVALID_PHONE', 'Enter a valid Nigerian mobile number.')
      }
      throw orderError
    }

    const createdOrder = orderRows?.[0]
    if (!createdOrder) throw new Error('The order transaction returned no result.')

    return jsonResponse(
      {
        data: {
          orderNumber: createdOrder.order_number,
          nextStepMessage:
            parsed.data.paymentMethod === 'PREPAID'
              ? 'Your order is reserved. Continue to the secure payment step when prompted.'
              : 'Your order is confirmed for review. Our team will contact you before delivery.',
        },
      },
      createdOrder.replayed ? 200 : 201,
      corsHeaders,
    )
  } catch (error) {
    return errorResponse(error, corsHeaders)
  }
})
