import { describe, expect, it } from 'vitest'

import { parsePublicEnv } from './env'

describe('parsePublicEnv', () => {
  it('accepts browser-safe Supabase configuration', () => {
    expect(
      parsePublicEnv({
        VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
        VITE_SUPABASE_ANON_KEY: 'a-valid-development-key',
        VITE_APP_ORIGIN: 'http://localhost:5173',
      }),
    ).toEqual({
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'a-valid-development-key',
      VITE_APP_ORIGIN: 'http://localhost:5173',
      VITE_DEPLOYMENT_ENV: 'local',
    })
  })

  it('fails clearly when required configuration is invalid', () => {
    expect(() => parsePublicEnv({ VITE_SUPABASE_URL: 'not-a-url' })).toThrow(
      'Invalid public environment configuration',
    )
  })

  it('rejects non-HTTPS production endpoints', () => {
    expect(() =>
      parsePublicEnv({
        VITE_SUPABASE_URL: 'http://project.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'a-valid-production-publishable-key',
        VITE_APP_ORIGIN: 'http://operations.example.com',
        VITE_DEPLOYMENT_ENV: 'production',
      }),
    ).toThrow('must use HTTPS')
  })
})
