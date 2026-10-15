export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors: Record<string, string[]> | null = null,
  ) {
    super(message)
  }
}

export function jsonResponse(body: unknown, status: number, corsHeaders: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export function errorResponse(error: unknown, corsHeaders: HeadersInit): Response {
  if (error instanceof HttpError) {
    return jsonResponse(
      {
        error: {
          code: error.code,
          message: error.message,
          fieldErrors: error.fieldErrors,
        },
      },
      error.status,
      corsHeaders,
    )
  }

  const errorKind = error instanceof Error ? error.name : typeof error
  const providerCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : null

  // Keep production logs useful without serializing request bodies, addresses, phones, or emails.
  console.error(JSON.stringify({ event: 'edge_function_error', errorKind, providerCode }))

  return jsonResponse(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'The request could not be completed.',
        fieldErrors: null,
      },
    },
    500,
    corsHeaders,
  )
}
