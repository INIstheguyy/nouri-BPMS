import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'

import { requestPasswordReset } from './api'

const forgotSchema = z.object({ email: z.string().trim().email('Enter a valid email address.') })
type ForgotFields = z.infer<typeof forgotSchema>

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFields>({ resolver: zodResolver(forgotSchema) })

  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      await requestPasswordReset(email)
    } finally {
      setSent(true)
    }
  })

  return (
    <div className="auth-card">
      <p className="eyebrow">Account recovery</p>
      <h2>Reset your password</h2>
      <p className="form-copy">Enter your staff email and we’ll send recovery instructions.</p>
      {sent ? (
        <div className="form-notice" role="status">
          If an active account exists for that email, a recovery link is on its way.
        </div>
      ) : (
        <form onSubmit={(event) => void onSubmit(event)} noValidate>
          <label>
            Email
            <input autoComplete="email" type="email" {...register('email')} />
            {errors.email && <span className="field-error">{errors.email.message}</span>}
          </label>
          <button className="secondary-action form-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Sending…' : 'Send recovery link'}
          </button>
        </form>
      )}
      <Link className="text-link" to="/login">
        Back to sign in
      </Link>
    </div>
  )
}
