import { z } from 'npm:zod@3.25.76'

import { authorize } from '../_shared/auth.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { errorResponse, HttpError, jsonResponse } from '../_shared/http.ts'

const roleSchema = z.object({
  userId: z.string().uuid(),
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
    const parsed = roleSchema.safeParse(await request.json())

    if (!parsed.success) {
      throw new HttpError(
        422,
        'VALIDATION_FAILED',
        'Choose a valid staff member and role.',
        parsed.error.flatten().fieldErrors,
      )
    }

    if (parsed.data.userId === actor.id) {
      throw new HttpError(422, 'SELF_ROLE_CHANGE_DENIED', 'You cannot change your own role.')
    }

    const { error } = await adminClient.rpc('set_staff_role', {
      target_user_id: parsed.data.userId,
      target_role_code: parsed.data.roleCode,
      actor_user_id: actor.id,
    })

    if (error) throw error

    return jsonResponse(
      { data: { id: parsed.data.userId, roleCode: parsed.data.roleCode } },
      200,
      corsHeaders,
    )
  } catch (error) {
    return errorResponse(error, corsHeaders)
  }
})
