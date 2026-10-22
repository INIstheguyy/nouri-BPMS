import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation } from 'react-router-dom'
import { z } from 'zod'

import { formatMoney } from '../../shared/lib/money'
import { queryKeys } from '../../shared/lib/query-keys'
import { listActiveOffers } from '../catalogue/api'
import { createPublicOrder, type PublicOrderPayload } from './api'

const orderFormSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(160),
  phone: z
    .string()
    .trim()
    .regex(/^0[789]\d{9}$/, 'Enter an 11-digit Nigerian phone number.'),
  addressLine: z.string().trim().min(5, 'Enter a complete delivery address.').max(300),
  area: z.string().trim().min(2, 'Enter your area or neighbourhood.').max(120),
  landmark: z.string().trim().max(200),
  offerId: z.string().uuid('Choose a package.'),
})

type OrderFormFields = z.infer<typeof orderFormSchema>
type Step = 'contact' | 'package'

function optional(value: string): string | undefined {
  return value || undefined
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

function NouriMark() {
  return (
    <Link className="public-brand" to="/order">
      Nouri
      <small>Daily Fibre</small>
    </Link>
  )
}

export function PublicOrderPage() {
  const location = useLocation()
  const [step, setStep] = useState<Step>('contact')
  const [result, setResult] = useState<{ orderNumber: string; message: string } | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState(() => `public-order-${crypto.randomUUID()}`)
  const offersQuery = useQuery({
    queryKey: queryKeys.catalogue.active(),
    queryFn: listActiveOffers,
  })
  const createOrder = useMutation({
    mutationFn: ({ payload, key }: { payload: PublicOrderPayload; key: string }) =>
      createPublicOrder(payload, key),
  })
  const {
    register,
    handleSubmit,
    reset,
    trigger,
    formState: { errors },
  } = useForm<OrderFormFields>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      addressLine: '',
      area: '',
      landmark: '',
      offerId: '',
    },
  })

  async function continueToPackages() {
    const valid = await trigger(['fullName', 'phone', 'addressLine', 'area'])
    if (valid) setStep('package')
  }

  const onSubmit = handleSubmit(async (fields) => {
    const payload: PublicOrderPayload = {
      customer: { name: fields.fullName, whatsapp: fields.phone },
      offerId: fields.offerId,
      paymentMethod: 'COD',
      delivery: {
        state: 'Lagos',
        city: 'Lagos',
        area: fields.area,
        addressLine: fields.addressLine,
        landmark: optional(fields.landmark),
      },
      attribution: getAttribution(location.search),
    }
    const response = await createOrder.mutateAsync({ payload, key: idempotencyKey })
    setResult({ orderNumber: response.orderNumber, message: response.nextStepMessage })
    setIdempotencyKey(`public-order-${crypto.randomUUID()}`)
    reset()
  })

  if (result) {
    return (
      <main className="public-success">
        <NouriMark />
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className="public-success-card"
          initial={{ opacity: 0, scale: 0.96 }}
        >
          <span aria-hidden="true" className="public-success-mark">
            ✓
          </span>
          <p className="eyebrow">Order received</p>
          <h1>Thank you. We’ve got it.</h1>
          <p className="public-order-number">{result.orderNumber}</p>
          <strong>We’ll call you within 30 minutes.</strong>
          <p>{result.message}</p>
          <button
            onClick={() => {
              setResult(null)
              setStep('contact')
            }}
            type="button"
          >
            Place another order
          </button>
        </motion.div>
      </main>
    )
  }

  return (
    <div className="public-checkout">
      <header>
        <NouriMark />
      </header>
      <main className="public-checkout-main">
        <section className="public-checkout-card" aria-labelledby="public-order-title">
          <div className="public-progress" aria-label={`Step ${step === 'contact' ? 1 : 2} of 2`}>
            <span className="is-complete" />
            <span className={step === 'package' ? 'is-complete' : ''} />
            <strong>Step {step === 'contact' ? 1 : 2} of 2</strong>
          </div>

          <form className="public-step-form" noValidate onSubmit={(event) => void onSubmit(event)}>
            <AnimatePresence mode="wait" initial={false}>
              {step === 'contact' ? (
                <motion.div
                  key="contact"
                  animate={{ opacity: 1, x: 0 }}
                  className="public-form-step"
                  exit={{ opacity: 0, x: '-12%' }}
                  initial={{ opacity: 0, x: '-8%' }}
                >
                  <div className="public-step-heading">
                    <p className="eyebrow">Delivery details</p>
                    <h1 id="public-order-title">Where should we send your Nouri?</h1>
                    <p>We’ll confirm everything by phone before delivery.</p>
                  </div>
                  <label>
                    Full name
                    <input autoComplete="name" {...register('fullName')} />
                    {errors.fullName && (
                      <span className="field-error">{errors.fullName.message}</span>
                    )}
                  </label>
                  <label>
                    Phone number
                    <input
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="0803 123 4567"
                      {...register('phone')}
                    />
                    {errors.phone && <span className="field-error">{errors.phone.message}</span>}
                  </label>
                  <label>
                    Delivery address
                    <textarea autoComplete="street-address" rows={3} {...register('addressLine')} />
                    {errors.addressLine && (
                      <span className="field-error">{errors.addressLine.message}</span>
                    )}
                  </label>
                  <label>
                    Area / neighbourhood
                    <input placeholder="e.g. Yaba" {...register('area')} />
                    {errors.area && <span className="field-error">{errors.area.message}</span>}
                  </label>
                  <label>
                    Landmark <small>(optional)</small>
                    <input {...register('landmark')} />
                  </label>
                  <button
                    className="public-primary"
                    onClick={() => void continueToPackages()}
                    type="button"
                  >
                    Continue to packages
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="package"
                  animate={{ opacity: 1, x: 0 }}
                  className="public-form-step"
                  exit={{ opacity: 0, x: '12%' }}
                  initial={{ opacity: 0, x: '8%' }}
                >
                  <div className="public-step-heading">
                    <p className="eyebrow">Choose your order</p>
                    <h1 id="public-order-title">Pick a package.</h1>
                    <p>Prices come directly from Nouri’s current catalogue.</p>
                  </div>
                  <fieldset className="public-package-fieldset">
                    <legend>Package</legend>
                    {offersQuery.isPending && <p>Loading current packages…</p>}
                    <div className="public-package-grid">
                      {offersQuery.data?.map((offer) => (
                        <label className="public-package" key={offer.id}>
                          <input type="radio" value={offer.id} {...register('offerId')} />
                          <span>
                            <strong>{offer.name}</strong>
                            <small>
                              {offer.items
                                .map((item) => `${item.quantity} × ${item.name}`)
                                .join(' + ')}
                            </small>
                            <b>{formatMoney(offer.basePrice, offer.currency)}</b>
                          </span>
                        </label>
                      ))}
                    </div>
                    {errors.offerId && (
                      <span className="field-error">{errors.offerId.message}</span>
                    )}
                  </fieldset>
                  <fieldset className="public-payment-fieldset">
                    <legend>Payment method</legend>
                    <label className="public-payment">
                      <input checked readOnly type="radio" />
                      <span>
                        <strong>Cash on delivery</strong>
                        <small>Pay when your order arrives</small>
                      </span>
                    </label>
                    <label className="public-payment is-disabled">
                      <input disabled type="radio" />
                      <span>
                        <strong>Pay online</strong>
                        <small>Coming soon</small>
                      </span>
                    </label>
                  </fieldset>
                  {offersQuery.isError && (
                    <div className="form-error">
                      Packages are unavailable right now. Please try again.
                    </div>
                  )}
                  {createOrder.isError && (
                    <div className="form-error">
                      We could not submit your order. Check your details and try again.
                    </div>
                  )}
                  <div className="public-form-actions">
                    <button onClick={() => setStep('contact')} type="button">
                      Back
                    </button>
                    <button
                      className="public-primary"
                      disabled={
                        createOrder.isPending || offersQuery.isPending || offersQuery.isError
                      }
                      type="submit"
                    >
                      {createOrder.isPending ? 'Placing order…' : 'Place order'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </section>
        <p className="public-reassurance">
          Secure order request · No account needed · We confirm before dispatch
        </p>
      </main>
      <footer>Questions? Our team will contact you after your order is placed.</footer>
    </div>
  )
}
