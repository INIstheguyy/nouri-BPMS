import { HttpError } from './http.ts'

export interface PaymentInitialization {
  provider: string
  reference: string
  mode: 'test'
}

export interface PaymentProvider {
  readonly name: string
  initialize(orderId: string): PaymentInitialization
}

function isLocalSupabase(): boolean {
  try {
    const hostname = new URL(Deno.env.get('SUPABASE_URL') ?? '').hostname
    return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === 'kong'
  } catch {
    return false
  }
}

class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock'

  initialize(orderId: string): PaymentInitialization {
    const orderPrefix = orderId.replaceAll('-', '').slice(0, 12)
    return {
      provider: this.name,
      reference: `mock_${orderPrefix}_${crypto.randomUUID()}`,
      mode: 'test',
    }
  }
}

export function getPaymentProvider(): PaymentProvider {
  const configuredProvider = (Deno.env.get('PAYMENT_PROVIDER') ?? 'mock').trim().toLowerCase()

  if (configuredProvider !== 'mock') {
    throw new HttpError(
      503,
      'PAYMENT_PROVIDER_UNAVAILABLE',
      'No supported payment provider is configured.',
    )
  }
  if (!isLocalSupabase() && Deno.env.get('ALLOW_MOCK_PAYMENT_PROVIDER') !== 'true') {
    throw new HttpError(503, 'MOCK_PROVIDER_DISABLED', 'The mock payment provider is disabled.')
  }

  return new MockPaymentProvider()
}

export function getMockWebhookSecret(): string {
  const configuredSecret = Deno.env.get('MOCK_PAYMENT_WEBHOOK_SECRET')
  if (configuredSecret) return configuredSecret
  if (isLocalSupabase()) return 'nouri-local-mock-webhook-secret'

  throw new HttpError(503, 'WEBHOOK_SECRET_MISSING', 'The payment webhook is not configured.')
}
