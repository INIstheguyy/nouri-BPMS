import { describe, expect, it } from 'vitest'

import { normalizeNigerianPhone } from '../../supabase/functions/_shared/phone'

describe('normalizeNigerianPhone', () => {
  it.each([
    ['0803 123 4567', '+2348031234567'],
    ['+2348031234567', '+2348031234567'],
    ['234-803-123-4567', '+2348031234567'],
    ['8031234567', '+2348031234567'],
    ['(0803) 123-4567', '+2348031234567'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeNigerianPhone(input)).toBe(expected)
  })

  it('rejects unsupported numbers', () => {
    expect(() => normalizeNigerianPhone('12345')).toThrow('Invalid Nigerian mobile number')
  })
})
