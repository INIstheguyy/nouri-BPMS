const fallbackOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173']

function isLocalSupabase(): boolean {
  try {
    const hostname = new URL(Deno.env.get('SUPABASE_URL') ?? '').hostname
    return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === 'kong'
  } catch {
    return false
  }
}

function parseOrigin(value: string): string | null {
  try {
    const url = new URL(value)
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      return null
    }
    if (!isLocalSupabase() && url.protocol !== 'https:') return null
    return url.origin
  } catch {
    return null
  }
}

export function getAllowedOrigins(): string[] {
  const configuredOrigins = Deno.env.get('ALLOWED_ORIGINS')

  if (!configuredOrigins) {
    return isLocalSupabase() ? fallbackOrigins : []
  }

  return configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(parseOrigin)
    .filter((origin): origin is string => origin !== null)
}

export function getCorsHeaders(request: Request): HeadersInit | null {
  const origin = request.headers.get('origin')
  const allowedOrigins = getAllowedOrigins()

  if (allowedOrigins.length === 0) return null

  if (origin && !allowedOrigins.includes(origin)) {
    return null
  }

  return {
    'Access-Control-Allow-Origin': origin ?? allowedOrigins[0] ?? 'null',
    'Access-Control-Allow-Headers':
      'authorization, apikey, content-type, x-client-info, x-idempotency-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}
