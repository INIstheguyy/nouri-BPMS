import { z } from 'zod'

const publicEnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(20, 'Supabase publishable key is missing.'),
  VITE_APP_ORIGIN: z.string().url(),
  VITE_DEPLOYMENT_ENV: z.enum(['local', 'production']).default('local'),
})

export type PublicEnv = z.infer<typeof publicEnvSchema>

export function parsePublicEnv(input: Record<string, unknown>): PublicEnv {
  const result = publicEnvSchema.safeParse(input)

  if (!result.success) {
    const issues = result.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error(`Invalid public environment configuration: ${issues}`)
  }

  const configuration = result.data

  if (configuration.VITE_DEPLOYMENT_ENV === 'production') {
    const supabaseUrl = new URL(configuration.VITE_SUPABASE_URL)
    const appOrigin = new URL(configuration.VITE_APP_ORIGIN)

    if (supabaseUrl.protocol !== 'https:' || appOrigin.protocol !== 'https:') {
      throw new Error('Production Supabase and application URLs must use HTTPS.')
    }
    if (typeof window !== 'undefined' && window.location.origin !== appOrigin.origin) {
      throw new Error('Production application origin does not match the deployed origin.')
    }
  }

  return configuration
}

export const publicEnv = parsePublicEnv(import.meta.env)
