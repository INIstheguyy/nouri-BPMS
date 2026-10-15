import type { Session } from '@supabase/supabase-js'
import { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { supabase } from '../../lib/supabase/client'
import { AuthContext } from './AuthContext'
import type { AccessSnapshot, AuthContextValue, AuthStatus } from './types'

interface AccessRow {
  user_id: string
  email: string
  full_name: string
  roles: string[] | null
  permissions: string[] | null
}

function normalizeAccess(row: AccessRow): AccessSnapshot {
  return {
    profileId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    roles: row.roles ?? [],
    permissions: row.permissions ?? [],
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [access, setAccess] = useState<AccessSnapshot | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const requestSequence = useRef(0)
  const deliberateSignOut = useRef(false)
  const hadSession = useRef(false)

  const applySession = useCallback(async (nextSession: Session | null) => {
    const requestId = ++requestSequence.current
    setSession(nextSession)
    hadSession.current = nextSession !== null
    setError(null)

    if (!nextSession) {
      setAccess(null)
      setStatus('unauthenticated')
      return
    }

    setStatus('loading')
    const { data, error: accessError } = await supabase.rpc('get_my_access')

    if (requestId !== requestSequence.current) return

    if (accessError) {
      setAccess(null)
      setError('We could not verify your staff access. Please try again.')
      setStatus('error')
      return
    }

    const row = (data?.[0] ?? null) as AccessRow | null

    if (!row) {
      setAccess(null)
      setStatus('inactive')
      return
    }

    setAccess(normalizeAccess(row))
    setSessionExpired(false)
    setStatus('authenticated')
  }, [])

  useEffect(() => {
    let mounted = true

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return
      if (sessionError) {
        setError('We could not restore your session. Please sign in again.')
        setStatus('error')
        return
      }
      void applySession(data.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return

      if (event === 'SIGNED_OUT') {
        setSessionExpired(!deliberateSignOut.current && hadSession.current)
        deliberateSignOut.current = false
      }

      queueMicrotask(() => {
        if (mounted) void applySession(nextSession)
      })
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [applySession])

  const refreshAccess = useCallback(async () => {
    await applySession(session)
  }, [applySession, session])

  const signOut = useCallback(async () => {
    deliberateSignOut.current = true
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) throw signOutError
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      access,
      status,
      error,
      sessionExpired,
      hasPermission: (permission) => access?.permissions.includes(permission) ?? false,
      refreshAccess,
      signOut,
    }),
    [access, error, refreshAccess, session, sessionExpired, signOut, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
