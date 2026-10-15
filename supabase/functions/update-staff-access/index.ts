import { z } from 'npm:zod@3.25.76'

import { authorize } from '../_shared/auth.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { errorResponse, HttpError, jsonResponse } from '../_shared/http.ts'

const accessSchema = z.object({
  userId: z.string().uuid(),
  active: z.boolean(),
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
    const parsed = accessSchema.safeParse(await request.json())

    if (!parsed.success) {
      throw new HttpError(
        422,
        'VALIDATION_FAILED',
        'Check the staff access fields.',
        parsed.error.flatten().fieldErrors,
      )
    }

    if (parsed.data.userId === actor.id && !parsed.data.active) {
      throw new HttpError(
        422,
        'SELF_DEACTIVATION_DENIED',
        'You cannot deactivate your own account.',
      )
    }

    if (parsed.data.active) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(parsed.data.userId, {
        ban_duration: 'none',
      })

      if (authError) {
        throw new HttpError(502, 'AUTH_UPDATE_FAILED', 'The Auth account could not be activated.')
      }
    }

    const { error: profileError } = await adminClient.rpc('set_staff_active', {
      target_user_id: parsed.data.userId,
      target_active: parsed.data.active,
      actor_user_id: actor.id,
    })

    if (profileError) {
      throw profileError
    }

    if (!parsed.data.active) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(parsed.data.userId, {
        ban_duration: '876000h',
      })

      if (authError) {
        throw new HttpError(
          502,
          'AUTH_UPDATE_FAILED',
          'Application access was revoked, but the Auth account could not be disabled.',
        )
      }
    }

    return jsonResponse(
      { data: { id: parsed.data.userId, active: parsed.data.active } },
      200,
      corsHeaders,
    )
  } catch (error) {
    return errorResponse(error, corsHeaders)
  }
})
