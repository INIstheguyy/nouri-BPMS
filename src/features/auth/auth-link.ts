export type PasswordLinkMode = 'invite' | 'recovery'

export function getPasswordLinkMode(hash: string, search: string): PasswordLinkMode {
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
  const searchParams = new URLSearchParams(search)
  const type = hashParams.get('type') ?? searchParams.get('type')
  return type === 'invite' ? 'invite' : 'recovery'
}
