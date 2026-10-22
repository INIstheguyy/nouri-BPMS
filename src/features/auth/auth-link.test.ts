import { describe, expect, it } from 'vitest'

import { getPasswordLinkMode } from './auth-link'

describe('getPasswordLinkMode', () => {
  it('detects Supabase invitation links from the URL hash', () => {
    expect(getPasswordLinkMode('#access_token=secret&type=invite', '')).toBe('invite')
  })

  it('detects recovery links and defaults unknown callbacks safely to recovery', () => {
    expect(getPasswordLinkMode('#access_token=secret&type=recovery', '')).toBe('recovery')
    expect(getPasswordLinkMode('', '?type=recovery&token_hash=secret')).toBe('recovery')
    expect(getPasswordLinkMode('', '')).toBe('recovery')
  })
})
