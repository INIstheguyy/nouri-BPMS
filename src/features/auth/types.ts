import type { Session, User } from '@supabase/supabase-js'

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'inactive' | 'error'

export interface AccessSnapshot {
  profileId: string
  email: string
  fullName: string
  roles: string[]
  permissions: string[]
}

export interface AuthContextValue {
  session: Session | null
  user: User | null
  access: AccessSnapshot | null
  status: AuthStatus
  error: string | null
  sessionExpired: boolean
  hasPermission: (permission: string) => boolean
  refreshAccess: () => Promise<void>
  signOut: () => Promise<void>
}
