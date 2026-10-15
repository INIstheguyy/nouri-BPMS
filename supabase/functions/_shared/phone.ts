export function normalizeNigerianPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '')
  let localNumber: string

  if (/^0[789]\d{9}$/.test(digits)) {
    localNumber = digits.slice(1)
  } else if (/^234[789]\d{9}$/.test(digits)) {
    localNumber = digits.slice(3)
  } else if (/^[789]\d{9}$/.test(digits)) {
    localNumber = digits
  } else {
    throw new Error('Invalid Nigerian mobile number')
  }

  return `+234${localNumber}`
}
