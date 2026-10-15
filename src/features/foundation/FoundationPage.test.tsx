import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FoundationPage } from './FoundationPage'

describe('FoundationPage', () => {
  it('describes the initialized foundation', () => {
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <FoundationPage />
      </QueryClientProvider>,
    )

    expect(
      screen.getByRole('heading', { name: /secure operations foundation is ready/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /check supabase connection/i })).toBeEnabled()
  })
})
