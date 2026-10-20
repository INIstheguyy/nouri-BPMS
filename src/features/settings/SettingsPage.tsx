import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { queryKeys } from '../../shared/lib/query-keys'
import {
  getOperationalSettings,
  listOfferConfiguration,
  type OfferConfiguration,
  type OperationalSettings,
  updateOfferConfiguration,
  updateOperationalSettings,
} from './api'
import { useAuth } from '../auth/useAuth'
import { formatMoney } from '../../shared/lib/money'
import { PageHeader } from '../../shared/ui/PageHeader'
import { ErrorState, LoadingState } from '../../shared/ui/ScreenState'

function OfferEditor({ offer, canManage }: { offer: OfferConfiguration; canManage: boolean }) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState({
    active: offer.active,
    basePrice: offer.base_price / 100,
    sortOrder: offer.sort_order,
  })
  const mutation = useMutation({
    mutationFn: updateOfferConfiguration,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.catalogue.configuration() }),
  })

  return (
    <form
      className="offer-editor"
      onSubmit={(event) => {
        event.preventDefault()
        mutation.mutate({
          offerId: offer.offer_id,
          active: draft.active,
          basePrice: Math.round(Number(draft.basePrice) * 100),
          prepaidPrice: offer.prepaid_price,
          sortOrder: Number(draft.sortOrder),
        })
      }}
    >
      <div className="offer-editor-heading">
        <div>
          <h3>{offer.name}</h3>
          <small>
            {offer.code} · {offer.item_summary || 'No items configured'}
          </small>
        </div>
        <label className="toggle-field">
          <input
            type="checkbox"
            disabled={!canManage}
            checked={draft.active}
            onChange={(event) =>
              setDraft((current) => ({ ...current, active: event.target.checked }))
            }
          />
          Active
        </label>
      </div>
      <div className="offer-fields">
        <label>
          Standard price (NGN)
          <input
            disabled={!canManage}
            required
            min="1"
            step="0.01"
            type="number"
            value={draft.basePrice}
            onChange={(event) =>
              setDraft((current) => ({ ...current, basePrice: Number(event.target.value) }))
            }
          />
        </label>
        <label>
          Display order
          <input
            disabled={!canManage}
            required
            min="-10000"
            max="10000"
            type="number"
            value={draft.sortOrder}
            onChange={(event) =>
              setDraft((current) => ({ ...current, sortOrder: Number(event.target.value) }))
            }
          />
        </label>
        <button className="table-action" disabled={!canManage || mutation.isPending} type="submit">
          {mutation.isPending ? 'Saving...' : 'Save offer'}
        </button>
      </div>
      <p className="offer-current-price">
        Current public price: {formatMoney(offer.base_price, offer.currency)}
      </p>
      {mutation.isSuccess && <div className="form-success">Offer saved and audited.</div>}
      {mutation.isError && (
        <div className="form-error">
          The offer could not be saved. Keep at least one offer active and verify the prices.
        </div>
      )}
    </form>
  )
}

function OperationalSettingsEditor({
  settings,
  canManage,
}: {
  settings: OperationalSettings
  canManage: boolean
}) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState({
    duplicateWarningHours: settings.duplicateWarningHours,
    businessPhone: settings.businessPhone ?? '',
    businessEmail: settings.businessEmail ?? '',
  })
  const mutation = useMutation({
    mutationFn: updateOperationalSettings,
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(queryKeys.settings.operational(), updatedSettings)
    },
  })

  return (
    <form
      className="workspace-card settings-form"
      onSubmit={(event) => {
        event.preventDefault()
        mutation.mutate(draft)
      }}
    >
      <div>
        <p className="eyebrow">Operations</p>
        <h2>Order and business defaults</h2>
      </div>
      <div className="admin-form-grid">
        <label>
          Duplicate warning window (hours)
          <input
            disabled={!canManage}
            max="168"
            min="1"
            required
            type="number"
            value={draft.duplicateWarningHours}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                duplicateWarningHours: Number(event.target.value),
              }))
            }
          />
          <small>Used by public and staff-created orders.</small>
        </label>
        <label>
          Default currency
          <input disabled value={settings.defaultCurrency} />
          <small>V1 is fixed to NGN.</small>
        </label>
        <label>
          Business phone
          <input
            disabled={!canManage}
            inputMode="tel"
            placeholder="0801 234 5678"
            value={draft.businessPhone}
            onChange={(event) =>
              setDraft((current) => ({ ...current, businessPhone: event.target.value }))
            }
          />
        </label>
        <label>
          Business email
          <input
            disabled={!canManage}
            type="email"
            value={draft.businessEmail}
            onChange={(event) =>
              setDraft((current) => ({ ...current, businessEmail: event.target.value }))
            }
          />
        </label>
      </div>
      {canManage && (
        <button className="secondary-action" disabled={mutation.isPending} type="submit">
          {mutation.isPending ? 'Saving...' : 'Save settings'}
        </button>
      )}
      {mutation.isSuccess && <div className="form-success">Settings saved and audited.</div>}
      {mutation.isError && (
        <div className="form-error">
          Settings could not be saved. Check the phone and email values.
        </div>
      )}
    </form>
  )
}

export function SettingsPage() {
  const auth = useAuth()
  const canManage = auth.hasPermission('settings.manage')
  const settingsQuery = useQuery({
    queryKey: queryKeys.settings.operational(),
    queryFn: getOperationalSettings,
  })
  const offersQuery = useQuery({
    queryKey: queryKeys.catalogue.configuration(),
    queryFn: listOfferConfiguration,
  })
  return (
    <section className="settings-page">
      <PageHeader
        eyebrow="Executive administration"
        title="Settings"
        description="Manage the small set of operational defaults and authoritative package prices."
      />

      {settingsQuery.isPending && <LoadingState>Loading settings...</LoadingState>}
      {settingsQuery.isError && <ErrorState>We could not load operational settings.</ErrorState>}
      {settingsQuery.data && (
        <OperationalSettingsEditor
          key={settingsQuery.data.updatedAt}
          settings={settingsQuery.data}
          canManage={canManage}
        />
      )}

      <section className="workspace-card offer-settings" aria-labelledby="offer-settings-title">
        <div>
          <p className="eyebrow">Checkout catalogue</p>
          <h2 id="offer-settings-title">Offer configuration</h2>
          <p>
            Prices are entered in naira and stored as integer kobo. Existing order snapshots do not
            change.
          </p>
        </div>
        {offersQuery.isPending && <LoadingState>Loading offers...</LoadingState>}
        {offersQuery.isError && <ErrorState>We could not load offer configuration.</ErrorState>}
        <div>
          {offersQuery.data?.map((offer) => (
            <OfferEditor key={offer.offer_id} offer={offer} canManage={canManage} />
          ))}
        </div>
        {!canManage && <p>You have read-only access to these settings.</p>}
      </section>
    </section>
  )
}
