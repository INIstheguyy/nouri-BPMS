# Nouri Operations

Internal order operations application built with React, TypeScript, Vite, and Supabase.

## Prerequisites

- Node.js 24+
- npm 12+
- Docker Desktop or Podman for the local Supabase stack

## Local setup

1. Install dependencies:

   ```powershell
   npm.cmd install
   ```

2. Copy `.env.example` to `.env.local` and replace the placeholder key with the local values printed by `npm.cmd run supabase:start`.

3. Start Supabase, then the frontend:

   ```powershell
   npm.cmd run supabase:start
   npm.cmd run dev
   ```

The application is served at `http://localhost:5173`. The foundation screen includes a safe check against the Supabase Auth health endpoint.

Hosted builds must use the browser-safe template in
[`deployment/production.env.example`](deployment/production.env.example), including
`VITE_DEPLOYMENT_ENV=production`. Production mode rejects non-HTTPS endpoints and an origin that
does not match the deployed browser origin.

## Quality checks

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run security:client-secrets
npm.cmd run release:check
```

The Playwright configuration uses the installed Google Chrome channel. Local Supabase commands require Docker Desktop or Podman to be running.

## Supabase commands

```powershell
npm.cmd run supabase:start
npm.cmd run supabase:reset
npm.cmd run supabase:test
npm.cmd run supabase:types
npm.cmd run supabase:stop
```

The migrations implement the domain schema, RBAC, deny-by-default RLS, catalog, order and delivery workflows, and the Step 9 payment workflow. Regenerate `src/types/database.ts` after every schema change.

Local prepaid testing uses the mock provider adapter documented in
[`supabase/functions/README.md`](supabase/functions/README.md). It never treats browser state as
payment proof; only the signed mock webhook can confirm a prepaid payment.

The first Executive Admin must be created with the trusted bootstrap process documented in [`scripts/README.md`](scripts/README.md). Do not place the Supabase service-role key or payment secrets in any `VITE_*` variable.

Production preparation, secrets, backups, rollback, observability, and hosted validation are
documented in [`deployment/README.md`](deployment/README.md) and
[`RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md).

The production landing-page order integration contract, offer mappings, CORS requirements,
idempotency policy, rollout steps, and acceptance criteria are documented in
[`LANDING_PAGE_BPMS_INTEGRATION.md`](LANDING_PAGE_BPMS_INTEGRATION.md).
