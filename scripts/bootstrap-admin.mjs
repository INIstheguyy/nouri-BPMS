import { createClient } from '@supabase/supabase-js'

const requiredEnvironment = [
  'SUPABASE_URL',
  'BOOTSTRAP_ADMIN_EMAIL',
  'BOOTSTRAP_ADMIN_PASSWORD',
  'BOOTSTRAP_ADMIN_NAME',
]

const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name])

if (missingEnvironment.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvironment.join(', ')}`)
}

const supabaseUrl = process.env.SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase()
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD
const fullName = process.env.BOOTSTRAP_ADMIN_NAME.trim()
const hostname = new URL(supabaseUrl).hostname
const isLocal = hostname === '127.0.0.1' || hostname === 'localhost'

if (!secretKey) {
  throw new Error('Missing required environment variable: SUPABASE_SECRET_KEY')
}

if (!isLocal) {
  const projectRef = hostname.endsWith('.supabase.co') ? hostname.split('.')[0] : null
  const expectedConfirmation = projectRef ? `BOOTSTRAP:${projectRef}:${email}` : null

  if (
    new URL(supabaseUrl).protocol !== 'https:' ||
    !projectRef ||
    process.env.ALLOW_REMOTE_ADMIN_BOOTSTRAP !== 'true' ||
    process.env.REMOTE_BOOTSTRAP_PROJECT_REF !== projectRef ||
    process.env.BOOTSTRAP_CONFIRMATION !== expectedConfirmation
  ) {
    throw new Error(
      'Remote bootstrap denied. HTTPS, the exact project ref, and the account-specific confirmation are required.',
    )
  }
}

if (password.length < 12) {
  throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters.')
}

if (fullName.length < 2) {
  throw new Error('BOOTSTRAP_ADMIN_NAME must contain at least 2 characters.')
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: listedUsers, error: listUsersError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
})

if (listUsersError) {
  throw listUsersError
}

let authUser = listedUsers.users.find((user) => user.email?.toLowerCase() === email)

if (!authUser) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (error) {
    throw error
  }

  authUser = data.user
}

const { error: profileError } = await supabase.from('profiles').upsert(
  {
    id: authUser.id,
    email,
    full_name: fullName,
    active: true,
  },
  { onConflict: 'id' },
)

if (profileError) {
  throw profileError
}

const { data: adminRole, error: roleError } = await supabase
  .from('roles')
  .select('id')
  .eq('code', 'EXECUTIVE_ADMIN')
  .single()

if (roleError) {
  throw roleError
}

const { data: existingAssignment, error: assignmentReadError } = await supabase
  .from('profile_roles')
  .select('profile_id')
  .eq('profile_id', authUser.id)
  .eq('role_id', adminRole.id)
  .maybeSingle()

if (assignmentReadError) {
  throw assignmentReadError
}

if (!existingAssignment) {
  const { error: assignmentError } = await supabase.from('profile_roles').insert({
    profile_id: authUser.id,
    role_id: adminRole.id,
    assigned_by_user_id: authUser.id,
  })

  if (assignmentError) {
    throw assignmentError
  }

  const { error: eventError } = await supabase.from('order_events').insert({
    entity_type: 'PROFILE',
    entity_id: authUser.id,
    actor_user_id: authUser.id,
    action: 'STAFF_ROLE_BOOTSTRAPPED',
    metadata: { role: 'EXECUTIVE_ADMIN' },
  })

  if (eventError) {
    throw eventError
  }
}

process.stdout.write(`Executive Admin bootstrap complete for ${email}.\n`)
