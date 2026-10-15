import { useMutation } from '@tanstack/react-query'

import { checkSupabaseConnectivity } from '../../lib/supabase/connectivity'

export function FoundationPage() {
  const connectivity = useMutation({ mutationFn: checkSupabaseConnectivity })

  return (
    <section className="hero" aria-labelledby="foundation-title">
      <p className="eyebrow">Nouri Operations V1</p>
      <h1 id="foundation-title">The secure operations foundation is ready.</h1>
      <p className="hero-copy">
        React, routing, server-state management, validated environment configuration, and the
        Supabase browser client are wired for the next vertical slice.
      </p>

      <div className="status-panel" aria-live="polite">
        <div>
          <span className="status-dot" aria-hidden="true" />
          <strong>Application shell</strong>
          <p>Running in strict TypeScript mode.</p>
        </div>
        <button
          className="secondary-action"
          disabled={connectivity.isPending}
          onClick={() => connectivity.mutate()}
          type="button"
        >
          {connectivity.isPending ? 'Checking…' : 'Check Supabase connection'}
        </button>
        {connectivity.isSuccess ? (
          <p className="check-result success">Supabase Auth endpoint is reachable.</p>
        ) : null}
        {connectivity.isError ? (
          <p className="check-result error">{connectivity.error.message}</p>
        ) : null}
      </div>

      <div className="foundation-grid">
        <article>
          <span>01</span>
          <h2>One order system</h2>
          <p>Landing pages, WhatsApp, and phone orders will share one canonical workflow.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Server-enforced access</h2>
          <p>Supabase Auth, RLS, and permission-aware commands will protect every operation.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Auditable progress</h2>
          <p>Order, delivery, and payment changes will be recorded as immutable events.</p>
        </article>
      </div>
    </section>
  )
}
