# Production deployment

Nouri uses a static Vite frontend and a linked hosted Supabase project. Production secrets belong in
the hosting provider or Supabase Edge Function secret store, never in browser-prefixed variables or
committed files.

## Required decisions before release

- Choose the canonical HTTPS application origin.
- Configure a production SMTP provider and sender in Supabase Auth.
- Choose a backup/PITR tier and record the recovery owner.
- Keep prepaid disabled operationally until a real provider adapter and signed production webhook
  replace the local mock. COD can ship independently.
- Select the error-log destination/alert owner for Supabase Edge Function and Postgres logs.

## Hosted Supabase setup

1. Create and link the intended project: `supabase link --project-ref <project-ref>`.
2. In Auth URL Configuration, set the Site URL to the canonical application origin and allow only:
   `<origin>/invite` and `<origin>/reset-password` (plus explicitly approved staging equivalents).
3. Disable public signup, configure a password policy of at least 12 characters, enable leaked
   password protection when available, and configure production SMTP.
4. Set Edge secrets from the controlled deployment shell:

   ```powershell
   supabase secrets set `
     ALLOWED_ORIGINS=https://operations.example.com `
     APP_ORIGIN=https://operations.example.com `
     RATE_LIMIT_SALT=<at-least-32-random-characters>
   ```

   Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; do not
   copy them into the frontend configuration. Do not enable the mock payment provider in production.

5. Review pending migrations with `supabase migration list`, take/verify a backup, then deploy with
   `supabase db push --dry-run` followed by `supabase db push` in the approved release window.
6. Deploy the Edge Functions listed in `supabase/config.toml` and the static frontend with the three
   browser-safe values shown in `production.env.example`.

Hosted Edge Functions intentionally reject browser traffic if `ALLOWED_ORIGINS` is absent or
invalid. Public order submission also returns a safe 503 if a 32-character `RATE_LIMIT_SALT` is not
configured.

## First administrator

Use `npm run bootstrap:admin` only from a trusted shell. Remote use requires all of:

```powershell
$env:ALLOW_REMOTE_ADMIN_BOOTSTRAP = 'true'
$env:REMOTE_BOOTSTRAP_PROJECT_REF = '<exact-project-ref>'
$env:BOOTSTRAP_CONFIRMATION = 'BOOTSTRAP:<exact-project-ref>:<lowercase-admin-email>'
```

Remove all bootstrap variables from the shell immediately afterwards. Subsequent staff accounts
must be invited through `/staff`.

## Backup, rollback, and recovery

- Confirm the latest hosted backup timestamp before every schema release. For high-volume launch,
  enable PITR and rehearse restoring into a separate project.
- Migrations are forward-only. Never edit an applied migration and never run `db reset` against a
  hosted project.
- For an application regression, redeploy the preceding frontend/Edge Function artifact while
  leaving compatible additive migrations in place.
- For a database regression, stop writes, capture a fresh backup, and ship a reviewed compensating
  migration. Restore from backup/PITR only for corruption or unrecoverable data loss.
- After recovery, verify Auth, active offers, recent order counts, payment/delivery states, and audit
  continuity before reopening traffic.

## Observability and privacy

- Route Supabase Auth, Postgres, and Edge Function logs to the chosen alerting destination.
- Alert on Edge 5xx/429 spikes, Auth failures, webhook signature failures, database saturation, and
  backup failures.
- Edge errors log only an event name and error kind/provider code. Do not add request bodies,
  customer phone numbers, addresses, access tokens, or credentials to logs.
- Retain immutable `order_events` for business audit. Set platform log retention according to the
  approved privacy policy.
