import { useCallback, useSyncExternalStore } from 'react'

const mobileQuery = '(max-width: 640px)'
const compactNavigationQuery = '(max-width: 900px)'

function subscribe(query: string, onStoreChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => undefined
  }

  const mediaQuery = window.matchMedia(query)
  mediaQuery.addEventListener('change', onStoreChange)
  return () => mediaQuery.removeEventListener('change', onStoreChange)
}

function getSnapshot(query: string) {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false
}

function useMediaQuery(query: string) {
  const subscribeToQuery = useCallback(
    (onStoreChange: () => void) => subscribe(query, onStoreChange),
    [query],
  )
  const getQuerySnapshot = useCallback(() => getSnapshot(query), [query])

  return useSyncExternalStore(subscribeToQuery, getQuerySnapshot, () => false)
}

export function useIsMobileView() {
  return useMediaQuery(mobileQuery)
}

export function useIsCompactNavigation() {
  return useMediaQuery(compactNavigationQuery)
}
