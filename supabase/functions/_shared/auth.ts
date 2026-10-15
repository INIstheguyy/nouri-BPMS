import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2'

import { HttpError } from './http.ts'

interface AuthorizedContext {
  actor: User
  adminClient: SupabaseClient
}

function requiredEnvironment(name: string): string {
  const value = Deno.env.get(name)

  if (!value) {
    throw new Error(`Missing Edge Function environment variable: ${name}`)
  }

  return value
}

export async function authorize(
  request: Request,
  requiredPermission: string,
): Promise<AuthorizedContext> {
  const authorization = request.headers.get('authorization')

  if (!authorization?.startsWith('Bearer ')) {
    throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication is required.')
  }

  const supabaseUrl = requiredEnvironment('SUPABASE_URL')
  const anonKey = requiredEnvironment('SUPABASE_ANON_KEY')
  const serviceRoleKey = requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY')
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser(authorization.slice('Bearer '.length))

  if (userError || !user) {
    throw new HttpError(401, 'AUTH_INVALID', 'The session is invalid or expired.')
  }

  const { data: allowed, error: permissionError } = await callerClient.rpc('has_permission', {
    requested_permission: requiredPermission,
  })

  if (permissionError || allowed !== true) {
    throw new HttpError(403, 'AUTH_FORBIDDEN', 'You do not have permission for this action.')
  }

  return { actor: user, adminClient }
}
