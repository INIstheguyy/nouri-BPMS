import '@testing-library/jest-dom/vitest'

if (!globalThis.IntersectionObserver) {
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    configurable: true,
    value: class IntersectionObserverMock {
      disconnect() {}
      observe() {}
      takeRecords() {
        return []
      }
      unobserve() {}
    },
  })
}

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
