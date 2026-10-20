import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { listActiveOffers } from '../catalogue/api'
import { formatMoney } from '../../shared/lib/money'
import { queryKeys } from '../../shared/lib/query-keys'
import { PageHeader } from '../../shared/ui/PageHeader'
import { ErrorState } from '../../shared/ui/ScreenState'
import { createManualOrder } from './api/orders'

const optionalEmail = z.union([z.literal(''), z.string().trim().email('Enter a valid email.')])
const schema = z.object({
  firstName: z.string().trim().min(1, 'Enter a first name.').max(100),
  lastName: z.string().trim().max(100),
  phone: z.string().trim().min(10, 'Enter a Nigerian phone number.').max(24),
  alternativePhone: z.string().trim().max(24),
  email: optionalEmail,
  offerId: z.string().uuid('Choose a package.'),
  source: z.enum(['WHATSAPP', 'PHONE', 'OTHER']),
  sourceDetail: z.string().trim().max(160),
  state: z.string().trim().min(2, 'Enter a state.').max(100),
  city: z.string().trim().max(100),
  area: z.string().trim().min(2, 'Enter an area.').max(120),
  addressLine: z.string().trim().min(5, 'Enter a complete address.').max(300),
  landmark: z.string().trim().max(200),
  customerNote: z.string().trim().max(500),
  internalNote: z.string().trim().max(2000),
})

type Fields = z.infer<typeof schema>

export function ManualOrderPage() {
  const navigate = useNavigate()
  const offersQuery = useQuery({
    queryKey: queryKeys.catalogue.active(),
    queryFn: listActiveOffers,
  })
  const createMutation = useMutation({ mutationFn: createManualOrder })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      alternativePhone: '',
      email: '',
      offerId: '',
      source: 'WHATSAPP',
      sourceDetail: '',
      state: 'Lagos',
      city: 'Lagos',
      area: '',
      addressLine: '',
      landmark: '',
      customerNote: '',
      internalNote: '',
    },
  })

  const onSubmit = handleSubmit(async (fields) => {
    const result = await createMutation.mutateAsync({ ...fields, paymentMethod: 'COD' })
    void navigate(`/orders/${result.order_id}`, {
      replace: true,
      state: { created: true, possibleDuplicate: result.possible_duplicate },
    })
  })

  return (
    <section className="manual-order-page">
      <Link className="text-link" to="/orders">
        ← Back to orders
      </Link>
      <PageHeader
        eyebrow="Assisted sales"
        title="Create order"
        description="For WhatsApp, phone, and other manually assisted customers. Pricing is calculated by the database."
      />
      {createMutation.isError && (
        <ErrorState>The order could not be created. Check the details and try again.</ErrorState>
      )}
      <form
        className="workspace-card manual-order-form"
        onSubmit={(event) => void onSubmit(event)}
        noValidate
      >
        <fieldset>
          <legend>Customer</legend>
          <div className="form-grid">
            <label>
              First name
              <input autoComplete="given-name" {...register('firstName')} />
              {errors.firstName && <span className="field-error">{errors.firstName.message}</span>}
            </label>
            <label>
              Last name <small>(optional)</small>
              <input autoComplete="family-name" {...register('lastName')} />
            </label>
            <label>
              Primary phone
              <input autoComplete="tel" inputMode="tel" {...register('phone')} />
              {errors.phone && <span className="field-error">{errors.phone.message}</span>}
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
          </div>
        </fieldset>
        <fieldset>
          <legend>Order</legend>
          <div className="form-grid">
            <label className="wide-field">
              Package
              <select {...register('offerId')}>
                <option value="">Choose package</option>
                {offersQuery.data?.map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {offer.name} — {formatMoney(offer.basePrice, offer.currency)}
                  </option>
                ))}
              </select>
              {errors.offerId && <span className="field-error">{errors.offerId.message}</span>}
            </label>
            <label>
              Payment method
              <input disabled value="Cash on delivery" />
            </label>
            <label>
              Source
              <select {...register('source')}>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="PHONE">Phone</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="wide-field">
              Source detail <small>(optional)</small>
              <input placeholder="e.g. Inbound WhatsApp chat" {...register('sourceDetail')} />
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend>Delivery</legend>
          <div className="form-grid">
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
              <input {...register('area')} />
              {errors.area && <span className="field-error">{errors.area.message}</span>}
            </label>
            <label className="wide-field">
              Address
              <textarea autoComplete="street-address" rows={3} {...register('addressLine')} />
              {errors.addressLine && (
                <span className="field-error">{errors.addressLine.message}</span>
              )}
            </label>
            <label className="wide-field">
              Landmark <small>(optional)</small>
              <input {...register('landmark')} />
            </label>
          </div>
        </fieldset>
        <details className="manual-order-optional">
          <summary>
            <span>Notes</span>
            <small>Optional</small>
          </summary>
          <fieldset>
            <div className="form-grid">
              <label className="wide-field">
                Customer-facing note <small>(optional)</small>
                <textarea rows={3} {...register('customerNote')} />
              </label>
              <label className="wide-field">
                Internal note <small>(optional)</small>
                <textarea rows={3} {...register('internalNote')} />
              </label>
            </div>
          </fieldset>
        </details>
        <button
          className="primary-action form-submit"
          disabled={createMutation.isPending || offersQuery.isPending}
          type="submit"
        >
          {createMutation.isPending ? 'Creating…' : 'Create order'}
        </button>
      </form>
    </section>
  )
}
