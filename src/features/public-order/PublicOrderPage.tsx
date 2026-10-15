import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation } from 'react-router-dom'
import { z } from 'zod'

import { createPublicOrder, listActiveOffers, type PublicOrderPayload } from './api'

const optionalEmail = z.union([
  z.literal(''),
  z.string().trim().email('Enter a valid email address.'),
])
const orderFormSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(160),
  whatsapp: z.string().trim().min(10, 'Enter a valid Nigerian WhatsApp number.').max(24),
  alternativePhone: z.string().trim().max(24),
  email: optionalEmail,
  offerId: z.string().uuid('Choose a package.'),
  state: z.string().trim().min(2, 'Enter your state.').max(100),
  city: z.string().trim().max(100),
  area: z.string().trim().min(2, 'Enter your area.').max(120),
  addressLine: z.string().trim().min(5, 'Enter a complete delivery address.').max(300),
  landmark: z.string().trim().max(200),
  customerNote: z.string().trim().max(500),
})

type OrderFormFields = z.infer<typeof orderFormSchema>

function optional(value: string): string | undefined {
  return value || undefined
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100)
}

function getAttribution(search: string): PublicOrderPayload['attribution'] {
  const params = new URLSearchParams(search)
  const channel = (params.get('source') ?? params.get('utm_source') ?? '').toLowerCase()
  const sourceMap: Record<string, PublicOrderPayload['attribution']['source']> = {
    tiktok: 'TIKTOK',
    facebook: 'FACEBOOK',
    instagram: 'INSTAGRAM',
    affiliate: 'AFFILIATE',
    website: 'WEBSITE',
  }

  return {
    source: sourceMap[channel] ?? 'LANDING_PAGE',
    sourceDetail: optional(params.get('source_detail') ?? ''),
    utmSource: optional(params.get('utm_source') ?? ''),
    medium: optional(params.get('utm_medium') ?? ''),
    campaign: optional(params.get('utm_campaign') ?? ''),
    content: optional(params.get('utm_content') ?? ''),
    term: optional(params.get('utm_term') ?? ''),
    landingPage: `${window.location.pathname}${window.location.search}`,
    referrer: optional(document.referrer),
    gclid: optional(params.get('gclid') ?? ''),
    fbclid: optional(params.get('fbclid') ?? ''),
    ttclid: optional(params.get('ttclid') ?? ''),
  }
}

export function PublicOrderPage() {
  const location = useLocation()
  const [result, setResult] = useState<{ orderNumber: string; message: string } | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState(() => `public-order-${crypto.randomUUID()}`)
  const offersQuery = useQuery({ queryKey: ['public-offers'], queryFn: listActiveOffers })
  const createOrder = useMutation({
    mutationFn: ({ payload, key }: { payload: PublicOrderPayload; key: string }) =>
      createPublicOrder(payload, key),
  })
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OrderFormFields>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      fullName: '',
      whatsapp: '',
      alternativePhone: '',
      email: '',
      offerId: '',
      state: 'Lagos',
      city: 'Lagos',
      area: '',
      addressLine: '',
      landmark: '',
      customerNote: '',
    },
  })
  const onSubmit = handleSubmit(async (fields) => {
    const payload: PublicOrderPayload = {
      customer: {
        name: fields.fullName,
        whatsapp: fields.whatsapp,
        alternativePhone: optional(fields.alternativePhone),
        email: optional(fields.email),
      },
      offerId: fields.offerId,
      paymentMethod: 'COD',
      delivery: {
        state: fields.state,
        city: optional(fields.city),
        area: fields.area,
        addressLine: fields.addressLine,
        landmark: optional(fields.landmark),
      },
      attribution: getAttribution(location.search),
      customerNote: optional(fields.customerNote),
    }

    const response = await createOrder.mutateAsync({
      payload,
      key: idempotencyKey,
    })
    setResult({ orderNumber: response.orderNumber, message: response.nextStepMessage })
    setIdempotencyKey(`public-order-${crypto.randomUUID()}`)
    reset()
  })

  if (result) {
    return (
      <main className="order-success">
        <Link className="brand" to="/order">
          <span className="brand-mark">N</span>
          <span>
            <strong>Nouri</strong>
            <small>Daily Fibre</small>
          </span>
        </Link>
        <div className="success-mark" aria-hidden="true">
          ✓
        </div>
        <p className="eyebrow">Order received</p>
        <h1>Thank you. We’ve got it.</h1>
        <p className="order-reference">Order number: {result.orderNumber}</p>
        <p className="hero-copy">{result.message}</p>
        <button className="secondary-action" type="button" onClick={() => setResult(null)}>
          Place another order
        </button>
      </main>
    )
  }

  return (
    <div className="public-order-frame">
      <header className="public-order-header">
        <Link className="brand" to="/order">
          <span className="brand-mark">N</span>
          <span>
            <strong>Nouri</strong>
            <small>Daily Fibre</small>
          </span>
        </Link>
        <Link className="text-link" to="/login">
          Staff sign in
        </Link>
      </header>

      <main className="public-order-main">
        <section className="order-promise">
          <p className="eyebrow">Simple daily wellness</p>
          <h1>Choose your Nouri package.</h1>
          <p className="hero-copy">
            Complete your delivery details. Our team will review your order and contact you before
            dispatch.
          </p>
          <div className="trust-note">
            <strong>Secure order request</strong>
            <span>Your final package price comes directly from Nouri’s current offer.</span>
          </div>
        </section>

        <section className="public-order-card" aria-labelledby="order-form-title">
          <p className="eyebrow">Delivery order</p>
          <h2 id="order-form-title">Tell us where to send it</h2>

          {offersQuery.isError && (
            <div className="form-error">Packages are unavailable right now. Please try again.</div>
          )}
          {createOrder.isError && (
            <div className="form-error">
              We could not submit your order. Check your details and try again.
            </div>
          )}

          <form onSubmit={(event) => void onSubmit(event)} noValidate>
            <fieldset className="offer-fieldset">
              <legend>Choose a package</legend>
              {offersQuery.isPending && <p>Loading current packages…</p>}
              <div className="offer-options">
                {offersQuery.data?.map((offer) => {
                  return (
                    <label className="offer-option" key={offer.id}>
                      <input type="radio" value={offer.id} {...register('offerId')} />
                      <span>
                        <strong>{offer.name}</strong>
                        <small>
                          {offer.items.map((item) => `${item.quantity} × ${item.name}`).join(' + ')}
                        </small>
                      </span>
                      <b>{formatMoney(offer.basePrice, offer.currency)}</b>
                    </label>
                  )
                })}
              </div>
              {errors.offerId && <span className="field-error">{errors.offerId.message}</span>}
            </fieldset>

            <div className="form-grid">
              <label className="wide-field">
                Full name
                <input autoComplete="name" {...register('fullName')} />
                {errors.fullName && <span className="field-error">{errors.fullName.message}</span>}
              </label>
              <label>
                WhatsApp number
                <input autoComplete="tel" inputMode="tel" {...register('whatsapp')} />
                {errors.whatsapp && <span className="field-error">{errors.whatsapp.message}</span>}
              </label>
              <label>
                Alternative phone <small>(optional)</small>
                <input autoComplete="tel" inputMode="tel" {...register('alternativePhone')} />
              </label>
              <label className="wide-field">
                Email <small>(optional)</small>
                <input autoComplete="email" type="email" {...register('email')} />
                {errors.email && <span className="field-error">{errors.email.message}</span>}
              </label>
              <label>
                State
                <input autoComplete="address-level1" {...register('state')} />
                {errors.state && <span className="field-error">{errors.state.message}</span>}
              </label>
              <label>
                City <small>(optional)</small>
                <input autoComplete="address-level2" {...register('city')} />
              </label>
              <label className="wide-field">
                Area
                <input placeholder="e.g. Yaba" {...register('area')} />
                {errors.area && <span className="field-error">{errors.area.message}</span>}
              </label>
              <label className="wide-field">
                Delivery address
                <textarea autoComplete="street-address" rows={3} {...register('addressLine')} />
                {errors.addressLine && (
                  <span className="field-error">{errors.addressLine.message}</span>
                )}
              </label>
              <label className="wide-field">
                Landmark <small>(optional)</small>
                <input {...register('landmark')} />
              </label>
              <label className="wide-field">
                Delivery note <small>(optional)</small>
                <textarea rows={2} {...register('customerNote')} />
              </label>
            </div>

            <fieldset className="payment-fieldset">
              <legend>Payment method</legend>
              <p>Pay on delivery</p>
            </fieldset>

            <button
              className="secondary-action form-submit"
              disabled={createOrder.isPending || offersQuery.isPending || offersQuery.isError}
              type="submit"
            >
              {createOrder.isPending ? 'Submitting securely…' : 'Place order'}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
