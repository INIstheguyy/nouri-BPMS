import { act, render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ToastHost, ToastProvider, useToast } from './Toast'

function ToastFixture() {
  const toast = useToast()
  const [undone, setUndone] = useState(false)
  return (
    <>
      <button onClick={() => toast('Order updated.', { undo: () => setUndone(true) })}>
        Show toast
      </button>
      {undone && <span>Update undone</span>}
      <ToastHost />
    </>
  )
}

describe('Toast', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('announces a message and runs its undo action', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <ToastFixture />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Show toast' }))
    expect(screen.getByRole('status')).toHaveTextContent('Order updated.')
    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(screen.getByText('Update undone')).toBeInTheDocument()
    await waitForElementToBeRemoved(() => screen.queryByRole('status'))
  })

  it('automatically dismisses after five seconds', async () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <ToastFixture />
      </ToastProvider>,
    )

    act(() => screen.getByRole('button', { name: 'Show toast' }).click())
    expect(screen.getByRole('status')).toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000)
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
