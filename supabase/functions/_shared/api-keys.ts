function firstConfiguredKey(environmentName: string): string | null {
  const rawValue = Deno.env.get(environmentName)
  if (!rawValue) return null

  try {
    const keys = JSON.parse(rawValue) as Record<string, unknown>
    const defaultKey = keys.default
    if (typeof defaultKey === 'string' && defaultKey.length > 0) return defaultKey

    const firstKey = Object.values(keys).find(
      (value): value is string => typeof value === 'string' && value.length > 0,
    )
    return firstKey ?? null
  } catch {
    return null
  }
}

function requiredApiKey(candidates: Array<[string, string]>): string {
  for (const [environmentName, kind] of candidates) {
    const key =
      kind === 'json' ? firstConfiguredKey(environmentName) : Deno.env.get(environmentName)
    if (key) return key
  }

  throw new Error('Missing Supabase API key in the Edge Function environment.')
}

export function getPublishableApiKey(): string {
  return requiredApiKey([
    ['NOURI_SUPABASE_PUBLISHABLE_KEY', 'plain'],
    ['SUPABASE_PUBLISHABLE_KEYS', 'json'],
    ['SUPABASE_ANON_KEY', 'plain'],
  ])
}

export function getSecretApiKey(): string {
  return requiredApiKey([
    ['NOURI_SUPABASE_SECRET_KEY', 'plain'],
    ['SUPABASE_SECRET_KEYS', 'json'],
    ['SUPABASE_SERVICE_ROLE_KEY', 'plain'],
  ])
}
