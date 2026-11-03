import { render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { ToastHost, ToastProvider, useToast } from './Toast'

function ToastFixture() {
  const toast = useToast()
  const [undone, setUndone] = useState(false)
  return (
    <>
      <button onClick={() => toast('Order updated.', { undo: () => setUndone(true) })}>
        Show toast
      </button>
      <button onClick={() => toast('Brief update.', { duration: 20 })}>Show brief toast</button>
      {undone && <span>Update undone</span>}
      <ToastHost />
    </>
  )
}

describe('Toast', () => {
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

  it('automatically dismisses after its duration', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <ToastFixture />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Show brief toast' }))
    expect(screen.getByRole('status')).toBeInTheDocument()
    await waitForElementToBeRemoved(() => screen.queryByRole('status'))
  })
})
