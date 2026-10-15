import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { updatePassword, verifyPasswordLink } from './api'
import { useAuth } from './useAuth'

const passwordSchema = z
  .object({
    password: z.string().min(12, 'Use at least 12 characters.'),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

type PasswordFields = z.infer<typeof passwordSchema>

export function SetPasswordPage({ mode }: { mode: 'invite' | 'recovery' }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const tokenHash = searchParams.get('token_hash') ?? token
  const [linkStatus, setLinkStatus] = useState<'checking' | 'ready' | 'invalid'>(
    auth.session ? 'ready' : 'checking',
  )
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFields>({ resolver: zodResolver(passwordSchema) })

  useEffect(() => {
    if (auth.session) return

    if (!tokenHash) return

    let active = true
    void verifyPasswordLink(tokenHash, mode)
      .then(() => {
        if (active) setLinkStatus('ready')
      })
      .catch(() => {
        if (active) setLinkStatus('invalid')
      })

    return () => {
      active = false
    }
  }, [auth.session, mode, tokenHash])

  const onSubmit = handleSubmit(async ({ password }) => {
    setSubmitError(null)
    try {
      await updatePassword(password)
      await auth.refreshAccess()
      void navigate('/dashboard', { replace: true })
    } catch {
      setSubmitError('We could not update your password. Request a new link and try again.')
    }
  })

  const effectiveLinkStatus = auth.session ? 'ready' : tokenHash ? linkStatus : 'invalid'

  if (effectiveLinkStatus === 'checking') {
    return <div className="auth-card">Verifying your secure link…</div>
  }

  if (effectiveLinkStatus === 'invalid') {
    return (
      <div className="auth-card">
        <p className="eyebrow">Link unavailable</p>
        <h2>This link is invalid or expired.</h2>
        <p className="form-copy">
          Request a fresh recovery link or ask an admin for a new invitation.
        </p>
        <Link className="text-link" to="/forgot-password">
          Request another link
        </Link>
      </div>
    )
  }

  return (
    <div className="auth-card">
      <p className="eyebrow">{mode === 'invite' ? 'Accept invitation' : 'Account recovery'}</p>
      <h2>{mode === 'invite' ? 'Set your password' : 'Choose a new password'}</h2>
      <p className="form-copy">Use at least 12 characters and keep it unique to Nouri.</p>
      {submitError && <div className="form-error">{submitError}</div>}
      <form onSubmit={(event) => void onSubmit(event)} noValidate>
        <label>
          New password
          <input autoComplete="new-password" type="password" {...register('password')} />
          {errors.password && <span className="field-error">{errors.password.message}</span>}
        </label>
        <label>
          Confirm password
          <input autoComplete="new-password" type="password" {...register('confirmPassword')} />
          {errors.confirmPassword && (
            <span className="field-error">{errors.confirmPassword.message}</span>
          )}
        </label>
        <button className="secondary-action form-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </div>
  )
}
