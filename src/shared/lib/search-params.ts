export type SearchParamUpdates = Record<string, string | null | undefined>

export function getPositiveIntegerSearchParam(
  searchParams: URLSearchParams,
  key: string,
  fallback = 1,
): number {
  const value = Number(searchParams.get(key))
  return Number.isInteger(value) && value > 0 ? value : fallback
}

export function updateSearchParams(
  searchParams: URLSearchParams,
  updates: SearchParamUpdates,
): URLSearchParams {
  const next = new URLSearchParams(searchParams)

  for (const [key, value] of Object.entries(updates)) {
    if (value) next.set(key, value)
    else next.delete(key)
  }

  return next
}
