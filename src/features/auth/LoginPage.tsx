import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { signInWithPassword } from './api'

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

type LoginFields = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFields>({ resolver: zodResolver(loginSchema) })
  const locationState = location.state as { from?: string; sessionExpired?: boolean } | null

  const onSubmit = handleSubmit(async (fields) => {
    setSubmitError(null)
    try {
      const signedIn = await signInWithPassword(fields.email, fields.password)
      if (!signedIn) {
        setSubmitError('The email or password is incorrect, or this account cannot sign in.')
        return
      }
      void navigate(locationState?.from ?? '/dashboard', { replace: true })
    } catch {
      setSubmitError('The email or password is incorrect, or this account cannot sign in.')
    }
  })

  return (
    <div className="auth-card">
      <p className="eyebrow">Welcome back</p>
      <h2>Sign in to Nouri</h2>
      <p className="form-copy">Use your staff email and password.</p>

      {locationState?.sessionExpired && (
        <div className="form-notice">Your session expired. Sign in to continue.</div>
      )}
      {submitError && <div className="form-error">{submitError}</div>}

      <form onSubmit={(event) => void onSubmit(event)} noValidate>
        <label>
          Email
          <input autoComplete="email" type="email" {...register('email')} />
          {errors.email && <span className="field-error">{errors.email.message}</span>}
        </label>
        <label>
          Password
          <input autoComplete="current-password" type="password" {...register('password')} />
          {errors.password && <span className="field-error">{errors.password.message}</span>}
        </label>
        <button className="secondary-action form-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <Link className="text-link" to="/forgot-password">
        Forgot password?
      </Link>
    </div>
  )
}
