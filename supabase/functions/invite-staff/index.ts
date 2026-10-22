import { z } from 'npm:zod@3.25.76'

import { authorize } from '../_shared/auth.ts'
import { getAllowedOrigins, getCorsHeaders } from '../_shared/cors.ts'
import { errorResponse, HttpError, jsonResponse } from '../_shared/http.ts'

const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((email) => email.toLowerCase()),
  fullName: z.string().trim().min(2).max(160),
  roleCode: z.enum(['ORDER_MANAGER', 'EXECUTIVE_ADMIN']),
})

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
    const { actor, adminClient } = await authorize(request, 'staff.manage')
    const parsed = inviteSchema.safeParse(await request.json())

    if (!parsed.success) {
      throw new HttpError(
        422,
        'VALIDATION_FAILED',
        'Check the staff invitation fields.',
        parsed.error.flatten().fieldErrors,
      )
    }

    const appOrigin = getAppOrigin(corsHeaders)
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      parsed.data.email,
      {
        data: { full_name: parsed.data.fullName },
        redirectTo: new URL('/auth/callback', appOrigin).toString(),
      },
    )

    if (inviteError || !inviteData.user) {
      const isConflict = inviteError?.message.toLowerCase().includes('already') ?? false
      throw new HttpError(
        isConflict ? 409 : 502,
        isConflict ? 'STAFF_ALREADY_EXISTS' : 'INVITE_DELIVERY_FAILED',
        isConflict
          ? 'A staff user with this email already exists.'
          : 'The invitation could not be sent.',
      )
    }

    const { error: finalizeError } = await adminClient.rpc('complete_staff_invite', {
      target_user_id: inviteData.user.id,
      target_email: parsed.data.email,
      target_full_name: parsed.data.fullName,
      target_role_code: parsed.data.roleCode,
      actor_user_id: actor.id,
    })

    if (finalizeError) {
      await adminClient.auth.admin.deleteUser(inviteData.user.id)
      throw finalizeError
    }

    return jsonResponse(
      {
        data: {
          id: inviteData.user.id,
          email: parsed.data.email,
          roleCode: parsed.data.roleCode,
          invited: true,
        },
      },
      201,
      corsHeaders,
    )
  } catch (error) {
    return errorResponse(error, corsHeaders)
  }
})

function getAllowedOrigin(corsHeaders: HeadersInit): string {
  const headers = new Headers(corsHeaders)
  const origin = headers.get('Access-Control-Allow-Origin')

  if (!origin || origin === 'null') {
    throw new Error('APP_ORIGIN or ALLOWED_ORIGINS must contain a valid application origin.')
  }

  return origin
}

function getAppOrigin(corsHeaders: HeadersInit): string {
  const configuredOrigin = Deno.env.get('APP_ORIGIN')
  const appOrigin = configuredOrigin
    ? new URL(configuredOrigin).origin
    : getAllowedOrigin(corsHeaders)

  if (!getAllowedOrigins().includes(appOrigin)) {
    throw new HttpError(
      503,
      'SERVICE_NOT_CONFIGURED',
      'Staff invitation redirects are not configured.',
    )
  }

  return appOrigin
}
