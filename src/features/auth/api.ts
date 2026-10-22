import { supabase } from '../../lib/supabase/client'

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error === null
}

export async function requestPasswordReset(email: string) {
  const redirectTo = new URL('/auth/callback', window.location.origin).toString()
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  if (error) {
    throw error
  }
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    throw error
  }
}

export async function verifyPasswordLink(tokenHash: string, type: 'invite' | 'recovery') {
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })

  if (error) {
    throw error
  }
}
