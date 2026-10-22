import { useLocation } from 'react-router-dom'

import { getPasswordLinkMode } from './auth-link'
import { SetPasswordPage } from './SetPasswordPage'

export function AuthCallbackPage() {
  const location = useLocation()
  const mode = getPasswordLinkMode(location.hash, location.search)
  return <SetPasswordPage mode={mode} />
}
