import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { useAuth } from '../auth/useAuth'
import { useToast } from '../../shared/ui/Toast'
import { updateMyProfileName } from './api'

function roleLabel(role?: string) {
  return (role ?? 'Staff')
    .toLowerCase()
    .split('_')
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ')
}

export function SettingsPage() {
  const auth = useAuth()
  const toast = useToast()
  const [fullName, setFullName] = useState(auth.access?.fullName ?? '')
  const nameMutation = useMutation({
    mutationFn: updateMyProfileName,
    onSuccess: async () => {
      await auth.refreshAccess()
      toast('Your name has been updated.')
    },
  })

  return (
    <section className="account-settings-page">
      <header>
        <p className="eyebrow">Your account</p>
        <h1>Settings</h1>
        <p>Keep your profile current and manage your session.</p>
      </header>

      <form
        className="account-card"
        onSubmit={(event) => {
          event.preventDefault()
          nameMutation.mutate(fullName.trim())
        }}
      >
        <div className="account-card-heading">
          <span className="staff-avatar">
            {fullName
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join('')
              .toUpperCase()}
          </span>
          <div>
            <strong>{auth.access?.fullName}</strong>
            <span>{auth.access?.email}</span>
          </div>
        </div>
        <label>
          Your name
          <input
            maxLength={160}
            minLength={2}
            onChange={(event) => setFullName(event.target.value)}
            required
            value={fullName}
          />
        </label>
        <label>
          Your role
          <input disabled value={roleLabel(auth.access?.roles[0])} />
        </label>
        {nameMutation.isError && <div className="form-error">Your name could not be updated.</div>}
        <button
          className="staff-invite"
          disabled={nameMutation.isPending || fullName.trim() === auth.access?.fullName}
          type="submit"
        >
          {nameMutation.isPending ? 'Saving…' : 'Save name'}
        </button>
      </form>

      <section className="account-session-card">
        <div>
          <strong>Current session</strong>
          <span>Signed in as {auth.access?.email}</span>
        </div>
        <button onClick={() => void auth.signOut()} type="button">
          Sign out
        </button>
      </section>

      <a
        className="remove-account-link"
        href="mailto:privacy@nouri.com?subject=Remove%20my%20Nouri%20account"
      >
        Remove account
      </a>
    </section>
  )
}
