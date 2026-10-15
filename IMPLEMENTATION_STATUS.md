# Nouri Operations V1 - Implementation Status

## STEP COMPLETED: Step 0 - Repository and Supabase audit

Audit date: 2026-10-12

### 1. Current repository architecture

- The workspace is a documentation-only starting point. It contains `AGENT_START_HERE.md` and `NOURI_V1_PRD_TECH_SPEC (1).md`.
- There is no Git repository metadata, application source, package manifest, lockfile, build configuration, CI configuration, or deployment configuration.
- No package manager has been established by the repository. npm is available on the machine and is the proposed default for Step 1.
- The kickoff document refers to `NOURI_V1_PRD_TECH_SPEC.md`, while the actual file is named `NOURI_V1_PRD_TECH_SPEC (1).md`. The latter was reviewed as the source of truth supplied by the Product Manager.

### 2. React / TypeScript / Vite state

- React is not initialized.
- TypeScript and strict-mode configuration are absent.
- Vite is not installed locally and no Vite configuration exists.
- There are no routes, state/data layer, UI components, styles, or environment validation.
- There is no existing component system to preserve. The Step 1 default should use React Router, TanStack Query, React Hook Form, Zod, Tailwind CSS, and small accessible primitives as specified, avoiding an unnecessary large component framework.

### 3. Supabase project/configuration state

- No `supabase/` directory, `supabase/config.toml`, project link metadata, seed, generated database types, or browser client exists.
- No `.env*` files or environment templates exist. No Supabase/Vite/payment-related environment variable names were detected in the current process.
- Supabase CLI `2.109.1` is globally installed. The PowerShell shim is blocked by the machine execution policy; `supabase.cmd` is the usable Windows entry point.
- In the restricted audit environment, the CLI also attempted to write telemetry under `C:\Users\TM\.supabase` and was denied. Project commands may need telemetry disabled or permission to use that CLI-owned directory.
- Docker is not installed or not on `PATH`. Therefore the Supabase local stack cannot currently start, and reset/integration checks cannot run.
- No linked remote Supabase development project is present.

### 4. Existing database schema and migrations

- No database schema, migrations, seed data, enums, constraints, indexes, views, or generated types exist.
- Step 2 will need to create the complete schema from an empty database. Applied migrations do not exist, so no historical migration is at risk of being modified.

### 5. Existing Supabase Auth / RLS / RBAC state

- Supabase Auth is not configured.
- There are no application profiles, roles, permissions, role assignments, RLS policies, permission helpers, or bootstrap-admin process.
- There are no exposed tables, so there is no current data leak; all operational tables must be introduced deny-by-default with RLS enabled in Step 2.

### 6. Existing Edge Functions / RPC functions

- No Edge Functions, Postgres functions, RPC commands, or webhook handlers exist.
- No service-role or third-party secrets were found in the workspace.

### 7. Existing build / lint / test result

- Node.js `v24.15.0`, npm `12.0.2`, and Git `2.53.0.windows.1` are available.
- Build: not runnable because `package.json` and application source do not exist.
- Lint: not runnable because no lint configuration or source exists.
- Unit/integration/E2E tests: not runnable because no test configuration or tests exist.
- Supabase reset/local tests: not runnable because there is no Supabase configuration and Docker is unavailable.
- Git status: not runnable because the directory is not a Git repository.

### 8. Proposed file + migration + function mapping for Nouri V1

The following is the planned target layout; files should be added only in their numbered implementation step.

```text
package.json
package-lock.json
.env.example
.gitignore
eslint.config.js
prettier.config.js
vite.config.ts
vitest.config.ts
playwright.config.ts
tsconfig*.json
src/
  app/                 # providers, router, protected layouts, navigation
  components/          # reusable accessible UI primitives
  features/
    auth/              # Steps 3 and 12: auth screens/session and staff access
    dashboard/         # Step 11: operations and executive dashboards
    orders/            # Steps 6-9: queue, detail, workflow, delivery, payment
    customers/         # Step 10: list, detail, history
    staff/             # Step 12: staff administration
    settings/          # Step 12: settings and offer administration
  lib/
    env.ts             # validated browser-safe environment
    supabase/client.ts # the single browser Supabase client
  types/database.ts    # generated Supabase schema types
supabase/
  config.toml
  seed.sql
  migrations/
    <timestamp>_schema_rbac_and_rls.sql
    <timestamp>_catalog_pricing_functions.sql
    <timestamp>_order_creation_functions.sql
    <timestamp>_order_workflow_functions.sql
    <timestamp>_delivery_functions.sql
    <timestamp>_payment_functions.sql
    <timestamp>_customer_queries.sql
    <timestamp>_dashboard_functions.sql
    <timestamp>_staff_settings_functions.sql
  functions/
    _shared/                     # CORS, auth, errors, schemas, phone utilities
    create-public-order/         # Step 5
    invite-staff/                # Steps 3/12
    initialize-prepaid-payment/  # Step 9
    payment-webhook-provider/    # Step 9, named for selected provider
  tests/                         # SQL/pgTAP and integration tests
tests/e2e/                       # Step-wise Playwright critical flows
scripts/bootstrap-admin.*        # controlled, non-browser admin bootstrap
```

Planned authoritative database functions include `has_permission`, active-offer/pricing helpers, the transactional public/manual order creation functions, order state commands, delivery state commands, `mark_cod_paid`, customer-history reads, dashboard RPCs, and audited staff/settings commands. Edge Functions are reserved for public entry, Admin Auth, payment secrets, and webhooks.

### 9. Dependencies that need to be added (with reasons)

- Runtime: `react`, `react-dom`, `react-router-dom`, and `@supabase/supabase-js` for the locked application and backend client.
- Data/forms/validation: `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, and `zod` for cache state, typed forms, and shared validation.
- UI: Tailwind CSS and narrowly selected accessible primitives; exact primitive packages should be chosen during Step 1 based on the shell needs.
- Development: TypeScript, Vite React tooling, ESLint, Prettier, Vitest, jsdom, Testing Library, and Playwright.
- Supabase CLI is already global, but project scripts should invoke a pinned development dependency or a documented `supabase.cmd` command to make versions reproducible on Windows.

### 10. Assumptions made

- The actual `(1)` spec file is authoritative despite the filename mismatch in the kickoff document.
- npm will be used because it is available and no repository convention exists.
- This directory is intended to become the project root.
- A local Supabase workflow remains the target; a remote development project is a fallback, not the default.
- Initial UI should be operational and accessible, optimized for desktop/tablet, without inventing brand assets that have not been supplied.
- Prices are stored as integer minor units (kobo) in Postgres unless the product owner explicitly requires another money representation.

### 11. Blockers or product decisions required

Immediate environment blockers:

- Docker Desktop or another Supabase-supported container runtime is required before the local stack/reset/integration suite can run.
- The Supabase CLI must be runnable through `supabase.cmd`, and its telemetry/config write path must be permitted or disabled.
- Git has not been initialized. This does not prevent scaffolding, but source-control history and safe checkpoints are unavailable until it is initialized.

Decisions that do not block Step 1 but must be resolved before their relevant feature step:

- Production prepaid payment provider and credentials (Step 9); the spec permits a development mock until selected.
- Exact prepaid prices/discount rule, delivery fees/free-delivery rules, and whether a promotional balm is currently included (Steps 2/4).
- Production/staging Supabase projects, hosting target, application origins, and Auth redirect URLs (Steps 3/13).
- Public-order anti-abuse/rate-limit provider or platform strategy (Step 5).
- Whether staff assignment, offer editing, and limited Order Manager acquisition analytics ship in V1 where the spec marks them optional/limited.
- Final cancellation, delivery-failure, and admin-override reason catalogs if the supplied defaults are not acceptable.

### 12. Security/RLS risks

- The greenfield state has no implemented security boundary. No operational data should be introduced before the Step 2 RLS foundation.
- Browser environment variables must be restricted to the Supabase URL and publishable/anon key; service-role and payment secrets must never use a `VITE_` prefix.
- Direct client writes to workflow status, totals, roles, permissions, payment success, and audit events must be denied. Trusted RPCs must derive `auth.uid()`, validate permission and state, lock rows where needed, and emit events atomically.
- Every exposed operational table requires RLS and explicit tests for anon, inactive, Order Manager, and Executive Admin behavior.
- Every `SECURITY DEFINER` function must have a fixed safe `search_path`, explicit grants, and server-side authorization.
- Public order intake and payment webhooks require validation, CORS controls, rate limiting, idempotency, safe error responses, and log redaction.
- Auth deactivation must be enforced both in application authorization and through the Admin Auth flow/session revocation where supported.

### 13. Exact plan for Step 1

1. Initialize Git if approved/desired and scaffold a React + TypeScript Vite app in this project root using npm without overwriting the two source documents or this report.
2. Enable strict TypeScript and create the feature-oriented source layout from the spec.
3. Install/configure the agreed baseline dependencies: Supabase JS, React Router, TanStack Query, React Hook Form, Zod, Tailwind, linting, formatting, Vitest/Testing Library, and Playwright configuration.
4. Initialize `supabase/` using the existing CLI, adding project scripts that work on Windows. Do not add schema migrations yet.
5. Add `.gitignore`, `.env.example`, and fail-fast validation for only browser-safe `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`/publishable key, and `VITE_APP_ORIGIN`.
6. Add the single typed browser Supabase client and a safe connectivity-status mechanism that does not require elevated credentials.
7. Add React Query and router providers plus a minimal accessible application shell and placeholder routes; do not implement Step 3 authentication behavior early.
8. Add CI-friendly `dev`, `build`, `lint`, `format:check`, `test`, `test:e2e`, `supabase:start`, `supabase:reset`, and Supabase test scripts.
9. Add baseline unit/component tests and run typecheck, lint, unit tests, and production build.
10. Attempt the local Supabase start/reset only after the container-runtime blocker is resolved; otherwise retain the documented blocker and verify configuration statically.
11. Update this file with the Step 1 checkpoint and stop for approval before Step 2.

---

## STEP COMPLETED: Step 1 - React + Supabase project foundations

Status: complete. The local Supabase stack starts, resets, and runs database tests successfully.

### 1. What was implemented

- Initialized this directory as a Git repository.
- Created a React 19 + TypeScript 6 + Vite 8 application with strict compiler settings and React Strict Mode.
- Added React Router, TanStack Query, React Hook Form, Zod, Tailwind CSS, and small class-name utilities.
- Added one validated public environment contract and one reusable Supabase browser client.
- Added a safe Supabase Auth health-endpoint connectivity check.
- Added a responsive, keyboard-accessible application shell and foundation screen.
- Added placeholder routes without implementing authentication or domain features ahead of their numbered steps.
- Added npm scripts for development, preview, build, typecheck, lint, formatting, unit tests, E2E tests, and local Supabase operations.
- Initialized the Supabase project structure without introducing Step 2 schema or seed data early.
- Added local setup and verification documentation.

### 2. Files/modules changed

- Root/tooling: `package.json`, `package-lock.json`, `index.html`, `.gitignore`, `.prettierignore`, `.env.example`, TypeScript/Vite/Vitest/Playwright/ESLint/Prettier configurations, and `README.md`.
- Application: `src/main.tsx`, `src/app/*`, `src/features/foundation/*`, `src/lib/env.ts`, `src/lib/supabase/*`, `src/styles.css`, and test setup.
- Backend foundation: `supabase/config.toml`, empty migration/function directories, an intentionally empty `supabase/seed.sql` placeholder, and a pgTAP foundation test.
- Tests: environment validation, foundation component behavior, a Playwright foundation smoke test, and a pgTAP database smoke test.

### 3. Database migrations

- None. The schema/RLS migration belongs to Step 2 and was intentionally not added in Step 1.

### 4. Supabase tables/views/RPCs/Edge Functions added/changed

- None. Supabase local configuration was added with public sign-up disabled.
- The browser connectivity check calls only the Supabase Auth health endpoint and does not require elevated credentials.
- Local Supabase CLI version: `2.120.0`.
- Local services use ports `55320`-`55329` because Windows/Hyper-V reserves the default `54320`-`54329` range on this machine.

### 5. UI routes/screens added/changed

- `/` - foundation readiness and connectivity screen.
- `/dashboard`, `/orders`, `/orders/new`, `/customers`, `/analytics`, `/staff`, and `/settings` - explicit placeholders reserved for their numbered implementation steps.
- Unknown routes return to `/`.
- Authentication routes and protected-route behavior remain correctly deferred to Step 3.

### 6. Tests added and current result

- Vitest environment validation tests: passed.
- React Testing Library foundation screen test: passed.
- Unit/component total: 2 files, 3 tests passed.
- Playwright foundation smoke test using installed Google Chrome: 1 passed.
- Strict TypeScript check: passed.
- ESLint with zero allowed warnings: passed.
- Prettier check: passed.
- Vite production build: passed (86 modules transformed).
- npm dependency audit during installation: 0 vulnerabilities reported.
- Playwright's managed Chromium download was unavailable because `cdn.playwright.dev` DNS resolution failed; the checked-in configuration uses the supported installed Chrome channel instead.
- Supabase start: passed on the configured `55320`-`55329` port range.
- Supabase reset: passed from a clean local database.
- Supabase pgTAP suite: 1 file, 1 test passed.

### 7. How to run/verify locally

```powershell
npm.cmd install
npm.cmd run dev

npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

With Docker Desktop running:

```powershell
npm.cmd run supabase:start
npm.cmd run supabase:reset
npm.cmd run supabase:test
```

The ignored `.env.local` contains the generated local publishable key only. It does not contain the service-role key.

### 8. Assumptions made

- npm remains the package manager because the repository had no prior convention.
- Google Chrome is an acceptable local Playwright target while the Playwright CDN is unavailable.
- Placeholder navigation is a foundation aid only; Step 3 will replace unrestricted internal routing with Supabase session and permission guards.
- Tailwind is available for feature development, while the small foundation stylesheet keeps the initial screen explicit and does not commit the product to a speculative component library.

### 9. Open blockers/TODOs

- No Step 1 blocker remains.
- The earlier product decisions listed in the Step 0 report remain due in their relevant implementation steps.
- No real secrets are present, and `.env.local` is ignored by Git.

### 10. Recommended next step

Approve Step 2: database schema, RLS foundation, RBAC seed data, and database security tests.

---

## STEP COMPLETED: Step 2 - Database schema, RLS foundation, and seed

Status: complete. A fresh local Supabase reset applies every migration and the full database test suite passes.

### 1. What was implemented

- Added the canonical Nouri V1 domain schema for staff access, customers, catalog/offers, orders, order items, payments, deliveries, audit events, and idempotency records.
- Added PostgreSQL enums, foreign keys, uniqueness rules, money/total invariants, Nigerian normalized-phone checks, state-dependent constraints, and operational indexes.
- Added automatic `updated_at` triggers and database-enforced immutability for order-item snapshots and audit events.
- Added explicit roles, permissions, role-permission mappings, and profile-role assignments.
- Added `is_active_staff()` and `has_permission(text)` as fixed-`search_path`, `SECURITY DEFINER` authorization helpers.
- Enabled RLS on all 15 exposed operational tables.
- Revoked browser mutation access and added only the minimum permission-aware read policies. Workflow writes remain reserved for later trusted RPC commands.
- Seeded both V1 roles, all 24 permissions, Nouri Daily Fibre, and the 1/2/3-pack offers with prices stored in integer kobo.
- Added a guarded, idempotent first-Executive-Admin bootstrap script that keeps the service-role key outside browser code.
- Generated the Supabase TypeScript database contract and connected it to the single browser client.

### 2. Files/modules changed

- `supabase/migrations/20261013000100_domain_schema.sql`
- `supabase/migrations/20261013000200_rbac_rls_and_seed.sql`
- `supabase/tests/000_foundation.test.sql`
- `supabase/tests/010_schema.test.sql`
- `supabase/tests/020_rls.test.sql`
- `supabase/tests/030_constraints_and_indexes.test.sql`
- `supabase/seed.sql`
- `scripts/bootstrap-admin.mjs`
- `scripts/README.md`
- `src/types/database.ts`
- `src/lib/supabase/client.ts`
- `package.json`, `README.md`, and `eslint.config.js`

### 3. Database migrations

- `20261013000100_domain_schema.sql`: enums, 15 tables, constraints, indexes, timestamp triggers, and immutable-history triggers.
- `20261013000200_rbac_rls_and_seed.sql`: permission catalog, role mappings, product/offer data, authorization helpers, grants, RLS enablement, and read policies.

### 4. Supabase tables/views/RPCs/Edge Functions added/changed

Tables:

- `profiles`, `roles`, `permissions`, `role_permissions`, `profile_roles`
- `customers`, `products`, `offers`, `offer_items`
- `orders`, `order_items`, `payments`, `deliveries`, `order_events`, `idempotency_keys`

Functions:

- `is_active_staff()`
- `has_permission(text)`
- `set_updated_at()` trigger function
- `prevent_immutable_row_mutation()` trigger function

No business-command RPC or Edge Function was added early; those remain assigned to later implementation steps.

### 5. UI routes/screens added/changed

- No new screen was required in Step 2.
- The existing Supabase client is now typed with the generated `Database` contract.

### 6. Tests added and current result

- Fresh `supabase db reset`: passed.
- pgTAP: 4 files, 47 assertions passed.
- Coverage includes table/type existence, seed counts, RLS on every table, anonymous denial, Order Manager permissions, Executive Admin permissions, inactive-staff denial, absence of browser DML grants, constraints, indexes, and audit immutability.
- Generated type command: passed.
- Bootstrap script syntax check: passed.
- Strict TypeScript: passed.
- ESLint with zero warnings: passed.
- Vitest/Testing Library: 2 files, 3 tests passed.
- Vite production build: passed.
- Playwright foundation smoke test: 1 passed.
- Prettier check: passed.

### 7. How to run/verify locally

```powershell
npm.cmd run supabase:start
npm.cmd run supabase:reset
npm.cmd run supabase:test
npm.cmd run supabase:types

npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

Bootstrap instructions are in `scripts/README.md`. The script requires trusted process environment variables and refuses a remote project unless `ALLOW_REMOTE_ADMIN_BOOTSTRAP=true` is explicitly set.

### 8. Assumptions made

- Money is stored as integer minor units (kobo): NGN 15,000 is stored as `1500000`.
- Every V1 order selects an offer; `orders.offer_id` is required while immutable order items preserve historical pricing details.
- No promotional balm is seeded because the supplied PRD describes it conditionally and no current offer decision was supplied.
- Prepaid prices remain null until the business selects the incentive rule.
- Essential RBAC/catalog records live in a migration because every environment requires them; `seed.sql` is reserved for later non-production fixtures.
- Order Managers receive `audit.read` for operational timelines, while broader staff/financial access remains Executive Admin-only.

### 9. Open blockers/TODOs

- No Step 2 technical blocker remains.
- Product decisions still needed before their relevant steps: prepaid pricing/provider, promotional balm inclusion, delivery-fee rules, and production Supabase/Auth redirect configuration.
- The bootstrap process is implemented but no real Executive Admin credentials were invented or stored. Run it with Product Manager-controlled credentials before Step 3 manual login verification.

### 10. Recommended next step

Approve Step 3: Supabase Auth and RBAC vertical slice, including login/recovery/invite screens, session handling, protected routes, the authorized `invite-staff` Edge Function, and deactivation enforcement tests.

---

## STEP COMPLETED: Step 3 - Supabase Auth and RBAC vertical slice

Status: complete. Staff authentication, server-owned access resolution, protected routing, invitation administration, and immediate deactivation enforcement are implemented and verified against the local Supabase stack.

### 1. What was implemented

- Added automatic `auth.users` to `profiles` linking. New Auth users start inactive until a trusted staff invitation/bootstrap flow assigns access.
- Added `get_my_access()` as the single browser-facing access snapshot for an active staff user, including server-derived roles and permissions.
- Added service-role-only transactional functions for invitation finalization and staff activation/deactivation. Both independently verify the Executive Admin actor and emit immutable audit events.
- Added the `invite-staff` Edge Function with JWT verification, `staff.manage` authorization, Zod validation, origin allowlisting, stable errors, Admin Auth invitation delivery, and transactional profile/role/audit finalization.
- Added the `update-staff-access` Edge Function. Deactivation removes application access first and then applies a long Auth ban; activation unbans Auth before restoring application access. Self-deactivation is denied.
- Kept public self-registration disabled while enabling the email/password provider for invited/admin-created users.
- Corrected the Auth-profile foreign key to cascade for disposable/unfinalized Auth-user cleanup. Existing historical references still prevent deletion where the domain requires preserved audit history.
- Added a Supabase session provider using `getSession` and `onAuthStateChange`, protected routes, inactive/error/session-expired states, and server-permission-driven navigation.
- Added login, forgot-password, recovery/reset-password, and invite/set-password screens using Supabase Auth, React Hook Form, and Zod.

### 2. Files/modules changed

- Backend: `supabase/migrations/20261013000300_auth_rbac.sql`, `supabase/config.toml`, `supabase/functions/_shared/*`, `supabase/functions/invite-staff/index.ts`, and `supabase/functions/update-staff-access/index.ts`.
- Database tests: `supabase/tests/020_rls.test.sql` and `supabase/tests/040_auth_rbac.test.sql`.
- Auth UI/state: `src/features/auth/*`.
- Application integration: `src/app/App.tsx`, `src/app/router.tsx`, `src/app/shell/AppShell.tsx`, and `src/styles.css`.
- Generated contract: `src/types/database.ts`.
- Tests: `src/features/auth/LoginPage.test.tsx`, `src/app/shell/AppShell.test.tsx`, and the protected-route Playwright smoke test.

### 3. Database migrations

- `20261013000300_auth_rbac.sql`: Auth-profile trigger, `get_my_access()`, service-role-only invitation finalization, audited activation/deactivation, safe function ownership/grants, and explicit browser revocations.
- `20261013000100_domain_schema.sql`: the greenfield `profiles.id` Auth foreign key now uses `ON DELETE CASCADE` so a failed/unfinalized Auth invitation can be cleaned up safely.

### 4. Supabase tables/views/RPCs/Edge Functions added/changed

Functions/RPCs:

- `handle_new_auth_user()` - private Auth trigger function.
- `get_my_access()` - authenticated active-staff access snapshot.
- `complete_staff_invite(...)` - service-role-only profile, role, and audit transaction.
- `set_staff_active(...)` - service-role-only audited activation/deactivation transaction.

Edge Functions:

- `invite-staff` - Executive Admin-only Supabase Admin Auth invitation workflow.
- `update-staff-access` - Executive Admin-only Auth and application access synchronization.

No service-role credential is included in browser code or checked-in environment files.

### 5. UI routes/screens added/changed

- `/login` - staff email/password sign-in with generic credential errors and session-expired messaging.
- `/forgot-password` - privacy-preserving password recovery request.
- `/reset-password` - recovery-token/session verification and password update.
- `/invite` and `/invite/:token` - invitation verification and initial password setup.
- All internal routes are protected by an active Supabase session plus a non-empty active application access snapshot.
- Dashboard, orders, customers, analytics, staff, settings, and create-order navigation are shown only when the server-returned permission set allows them.
- Inactive users receive an explicit access-unavailable screen and cannot enter the application shell.

### 6. Tests added and current result

- Fresh `supabase db reset`: passed with all three migrations.
- pgTAP: 5 files, 58 assertions passed.
- Database coverage includes Auth-profile creation, inactive-by-default behavior, service-role isolation, authorized invite finalization, role assignment, immutable audit creation, deactivation, self-deactivation denial, and removal of inactive access.
- Live Edge Runtime probes:
  - missing JWT invitation request: HTTP 401;
  - allowed-origin preflight: HTTP 204;
  - untrusted origin: HTTP 403;
  - authenticated Order Manager invitation request: HTTP 403;
  - previously authorized Executive Admin invitation request after profile deactivation, using the existing JWT: HTTP 403.
- Disposable local Auth users used by the live probes were removed after each test.
- Vitest/Testing Library: 4 files, 7 tests passed, including valid/invalid login and permission-aware navigation.
- Strict TypeScript: passed.
- ESLint with zero warnings: passed.
- Prettier check: passed.
- Vite production build: passed (140 modules transformed). Vite reports a non-blocking bundle-size warning for the current single entry chunk.
- Playwright protected-route smoke test in installed Chrome: 1 passed.

### 7. How to run/verify locally

```powershell
npm.cmd run supabase:start
npm.cmd run supabase:reset
npm.cmd run supabase:test
npm.cmd run supabase:types

npm.cmd run format:check
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

The local Supabase stack must be restarted after changing Edge Function entries or Auth configuration. Mailpit is available on the configured local SMTP port for invite/recovery inspection.

### 8. Assumptions made

- Global Auth signup remains disabled; enabling `auth.email.enable_signup` keeps the email/password provider available to users created through trusted Admin Auth flows without exposing public application registration.
- A 12-character minimum is enforced in the application password setup form; hosted Supabase password policy should be configured to the same or a stronger rule before production.
- Application profile state is checked on every access RPC/permission decision, so deactivation blocks an already-issued JWT immediately even before the Admin Auth ban takes effect.
- The long Auth ban is the V1 session-revocation strategy supported by the Admin Auth flow; reactivation explicitly removes it.

### 9. Open blockers/TODOs

- No Step 3 technical blocker remains.
- A real first Executive Admin still needs to be created with Product Manager-controlled credentials through the documented bootstrap process; no credentials were invented or stored.
- Production Supabase SMTP, site URL, redirect URLs, allowed origins, and password policy remain deployment configuration work for Step 13.
- Staff administration screens that call the completed Edge Functions remain correctly scheduled for Step 12.

### 10. Recommended next step

Approve Step 4: authoritative product/offer and pricing database services. Do not hard-code prices in the React client.

---

## STEP COMPLETED: Step 4 - Product/offer and pricing database services

Status: complete. Active offer discovery, item expansion, prepaid incentives, and final totals are derived authoritatively by Postgres.

### 1. What was implemented

- Verified and retained the product specification’s seeded packages: 1 Pack at NGN 15,000, 2 Packs at NGN 25,500, and 3 Packs at NGN 36,000, stored as integer kobo.
- Added one authoritative pricing RPC that resolves only complete, active offers and returns subtotal, configured prepaid discount, effective total, currency, and free-delivery state.
- Added an authoritative item-expansion RPC that returns immutable order-item snapshot values, including product identity, name/SKU snapshots, quantities, unit prices, totals, and zero-priced bonus items.
- Added consistency enforcement at resolution time: configured item totals must equal the offer base price, and an offer containing an inactive product is unavailable.
- Added an active-only, security-invoker catalog view for checkout and internal forms.
- Added narrowly scoped anonymous column grants and RLS policies for active catalog data. Anonymous clients still cannot mutate products, offers, or offer items.
- Regenerated the TypeScript database contract with the catalog view and both pricing functions.

### 2. Files/modules changed

- `supabase/migrations/20261013000400_catalog_pricing.sql`
- `supabase/tests/050_catalog_pricing.test.sql`
- `src/types/database.ts`
- `IMPLEMENTATION_STATUS.md`

### 3. Database migrations

- `20261013000400_catalog_pricing.sql`: authoritative pricing and item-expansion functions, safe active catalog view, anonymous read grants, and active-catalog RLS policies.

### 4. Supabase tables/views/RPCs/Edge Functions added/changed

View:

- `active_offer_catalog` - safe active offer/item/product projection using caller-invoker RLS semantics.

RPC functions:

- `resolve_offer_pricing(uuid, payment_method)` - accepts only offer identity and payment method; no client price enters the calculation.
- `expand_active_offer_items(uuid)` - returns server-configured order snapshot lines, including zero-value bonus lines.

No Edge Function was required for this database pricing step.

### 5. UI routes/screens added/changed

- No new screen was required in Step 4.
- The generated browser client contract now exposes the active catalog view and typed pricing/item RPC signatures for subsequent order forms.
- No package price was added to the React bundle.

### 6. Tests added and current result

- Fresh `supabase db reset`: passed with all four migrations.
- pgTAP: 6 files, 80 assertions passed.
- Step 4 coverage verifies:
  - exact totals for all three seeded packages;
  - PREPAID fallback when no incentive is configured;
  - configured prepaid discount and effective total;
  - COD remains unaffected by a prepaid incentive;
  - the pricing API has no client-price argument;
  - bonus-item expansion and zero pricing;
  - immutable order/item snapshots remain unchanged after offer edits;
  - inactive offers cannot be resolved;
  - anonymous catalog visibility is active-only;
  - anonymous price mutation is denied;
  - inconsistent item/base totals are rejected.
- Supabase database lint at warning level: no schema errors found.
- Generated TypeScript database types: passed.
- Prettier check: passed.
- Strict TypeScript: passed.
- ESLint with zero warnings: passed.
- Vitest/Testing Library: 4 files, 7 tests passed. The default fork pool timed out once while starting workers under local machine load; the complete suite passed with `--pool=threads --maxWorkers=1` and no assertion failures.
- Vite production build: passed (140 modules transformed), with the existing non-blocking single-chunk size warning.
- Playwright protected-route regression smoke test in installed Chrome: 1 passed.

### 7. How to run/verify locally

```powershell
npm.cmd run supabase:start
npm.cmd run supabase:reset
npm.cmd run supabase:test
npm.cmd run supabase:types
npx.cmd supabase db lint --local --level warning

npm.cmd run format:check
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

If the local machine is too busy to start Vitest fork workers within its timeout, the verified constrained command is:

```powershell
npm.cmd test -- --pool=threads --maxWorkers=1
```

### 8. Assumptions made

- No current prepaid price was invented. When `prepaid_price` is null, PREPAID uses the normal base price with zero discount.
- No promotional balm was added to production seed data because the specification makes it conditional and the business has not confirmed that promotion. The database behavior is implemented and tested with a transactional fixture.
- Configured product item lines represent the undiscounted subtotal. A prepaid incentive is stored separately as `orders.discount_amount`, while immutable item snapshots retain their configured unit prices.
- The active catalog is intentionally public-safe for the Step 5 acquisition checkout, but all catalog writes remain privileged.

### 9. Open blockers/TODOs

- No Step 4 technical blocker remains.
- Business confirmation is still required before configuring real prepaid prices, free delivery, or a promotional bonus product in production seed/settings.
- The authoritative public order transaction that consumes these functions belongs to Step 5.

### 10. Recommended next step

Approve Step 5: public acquisition to operational order vertical slice, using these functions for every total and item snapshot.

---

## STEP COMPLETED: Step 5 - Public acquisition to operational order vertical slice

Status: complete. A customer can submit the public order form through a validated Edge Function into one atomic, server-priced operational order transaction.

### 1. What was implemented

- Added a responsive public `/order` acquisition page that loads active packages from Supabase rather than hard-coded React prices.
- Added validated customer, Nigerian phone, package, payment method, delivery, note, and attribution/UTM/click-ID collection.
- Added the public `create-public-order` Edge Function with Zod validation, origin allowlisting, idempotency-key enforcement, canonical request fingerprinting, hashed-client rate limiting, stable public errors, and public-safe responses.
- Added matching TypeScript and Postgres Nigerian mobile normalization for local, international, digits-only, and punctuated variants.
- Added one service-role-only Postgres transaction that:
  - claims/locks the idempotency key;
  - re-normalizes phones;
  - resolves the active offer and authoritative Step 4 totals;
  - finds or creates the customer by canonical phone;
  - detects same-customer/same-offer active orders from the preceding 24 hours;
  - creates the order and immutable item snapshots;
  - creates payment, delivery, and `ORDER_CREATED` audit rows;
  - stores the replay result and returns only the order number/duplicate state to the Edge Function.
- Added a database-backed fixed-window rate limiter. It stores only salted SHA-256 bucket keys, not raw client addresses.
- Added collision-safe order numbers backed by a Postgres sequence.
- Added a public confirmation screen returning only the order number and next-step message.

### 2. Files/modules changed

- Backend migration: `supabase/migrations/20261013000500_public_order.sql`.
- Edge Function: `supabase/functions/create-public-order/index.ts`.
- Shared Edge helpers/configuration: `supabase/functions/_shared/phone.ts`, `supabase/functions/_shared/cors.ts`, `supabase/functions/README.md`, and `supabase/config.toml`.
- Public UI/API: `src/features/public-order/api.ts`, `src/features/public-order/PublicOrderPage.tsx`, `src/app/router.tsx`, and `src/styles.css`.
- Generated contract: `src/types/database.ts`.
- Tests: `supabase/tests/060_public_order.test.sql`, `src/lib/phone.test.ts`, `src/features/public-order/PublicOrderPage.test.tsx`, and `tests/e2e/foundation.spec.ts`.

### 3. Database migrations

- `20261013000500_public_order.sql`: request-fingerprint constraint, order-number sequence, private rate-limit storage, phone normalization, atomic rate-limit command, and atomic public-order creation command.

### 4. Supabase tables/views/RPCs/Edge Functions added/changed

Table:

- `public_request_limits` - RLS-enabled, grant-free storage for hashed abuse-prevention buckets.

Functions:

- `normalize_nigerian_phone(text)` - canonical `+234` normalization with rejection of invalid mobile numbers.
- `next_order_number()` - sequence-backed `NOU-YYYYMMDD-NNNNN` generator.
- `check_public_order_rate_limit(text, integer, integer)` - service-role-only atomic limiter.
- `create_public_order(...)` - service-role-only transactional order command with no price argument.

Edge Function:

- `create-public-order` - public, JWT-optional controlled entry point; the browser never receives service-role credentials.

### 5. UI routes/screens added/changed

- `/order` - public acquisition form with live active packages, current database prices, delivery/customer inputs, payment method, attribution capture, accessible validation, retry behavior, and confirmation state.
- `/login` remains linked separately for staff; the public order route is not placed behind staff Auth guards.

### 6. Tests added and current result

- Fresh `supabase db reset`: passed with all five migrations.
- pgTAP: 7 files, 114 assertions passed.
- Step 5 database coverage includes:
  - Nigerian phone variants and invalid-number rejection;
  - service-role isolation and anonymous direct-write denial;
  - fixed-window request limiting;
  - new customer and fully linked order/item/payment/delivery/event creation;
  - existing normalized-phone customer reuse;
  - authoritative total calculation with no client price parameter;
  - attribution and click-ID capture;
  - 24-hour duplicate warning;
  - identical idempotent replay and conflicting-key rejection;
  - invalid/inactive offer rejection;
  - full rollback after a late linked-record failure;
  - visibility of completed public orders to an authorized Order Manager.
- Live local Edge Function integration:
  - a request containing malicious `price: 1` returned HTTP 201 with the database price used internally;
  - an identical retry returned HTTP 200 and the same order number;
  - the response contained only `orderNumber` and `nextStepMessage`.
- Supabase database lint at warning level: no schema errors found.
- Vitest/Testing Library: 6 files, 14 tests passed, including shared phone normalization and public form submission without a price field.
- Strict TypeScript: passed.
- ESLint with zero warnings: passed.
- Prettier check: passed.
- Vite production build: passed (142 modules transformed), with the existing non-blocking bundle-size warning.
- Playwright in installed Chrome: 2 tests passed for protected staff routing and database-backed public package loading.

### 7. How to run/verify locally

```powershell
npm.cmd run supabase:start
npm.cmd run supabase:reset
npm.cmd run supabase:test
npm.cmd run supabase:types
npx.cmd supabase db lint --local --level warning

npm.cmd run format:check
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test -- --pool=threads --maxWorkers=1
npm.cmd run build
npm.cmd run test:e2e
```

Open `http://localhost:5173/order` while the Vite development server and local Supabase stack are running.

### 8. Assumptions made

- The duplicate-warning window is 24 hours and matches only the same canonical customer phone, same offer, and an active operational status.
- The public limiter permits six attempts per hashed client address per 60 seconds. Hosted deployment must provide a private `RATE_LIMIT_SALT` and explicit `ALLOWED_ORIGINS`.
- Delivery fee remains zero because the business has not supplied delivery-fee rules. Authoritative delivery-fee configuration can be added without accepting a client total.
- PREPAID creates a `PENDING` payment record. Payment-provider initialization remains correctly scheduled for Step 9.
- Two-step lead capture remains deferred as the specification marks it V1.1 optional.

### 9. Open blockers/TODOs

- No Step 5 technical blocker remains.
- Production deployment requires `RATE_LIMIT_SALT`, allowed origins, and platform/network confirmation that the trusted forwarded client-address header is supplied.
- Delivery-fee business rules, real prepaid incentive values, and the payment provider remain product decisions for their scheduled steps.

### 10. Recommended next step

Approve Step 6: authenticated orders queue, order detail, and manual WhatsApp/phone order creation.

---

## STEP COMPLETED: Step 6 - Orders queue, order detail, and manual WhatsApp order

Status: complete. Authorized staff can search and filter incoming orders, inspect a complete operational record, update allowed notes, and create an atomic server-priced manual order.

### 1. What was implemented

- Added a permission-checked, paginated order queue with order-number, customer-name, and local/international phone search plus status, source, payment-method, and date filters.
- Added one aggregate order-detail RPC returning customer, immutable items, totals, payment, delivery, attribution, and audit timeline data.
- Added an authenticated manual-order command for WhatsApp, phone, and other assisted channels. It normalizes phones, reuses customers, resolves authoritative offer pricing, detects likely duplicates, creates every linked record transactionally, assigns the creating staff member, and audits the actor.
- Added an audited notes command that permits only customer-note and internal-note updates instead of direct order mutation.
- Replaced the order placeholders with responsive queue, detail, and manual-create screens, including loading/error/empty states, quick status tabs, pagination, click-to-call, and WhatsApp links.

### 2. Files/modules changed

- `supabase/migrations/20261013000600_orders_workspace.sql`
- `supabase/tests/070_orders_workspace.test.sql`
- `src/features/orders/api.ts`
- `src/features/orders/OrdersPage.tsx`
- `src/features/orders/OrderDetailPage.tsx`
- `src/features/orders/ManualOrderPage.tsx`
- `src/features/orders/OrdersPage.test.tsx`
- `src/features/orders/ManualOrderPage.test.tsx`
- `src/app/router.tsx`, `src/styles.css`, and `src/types/database.ts`

### 3. Database migrations

- `20261013000600_orders_workspace.sql`: secure list/detail/manual-create/note-update functions and least-privilege authenticated grants.

### 4. Supabase tables/views/RPCs/Edge Functions added/changed

RPC functions:

- `list_orders(...)`
- `get_order_detail(uuid)`
- `create_manual_order(...)`
- `update_order_notes(uuid, text, text)`

No table or Edge Function was required. Existing RLS remains enabled and browser roles retain no direct operational mutation grants.

### 5. UI routes/screens added/changed

- `/orders` - operational queue with search, filters, quick status tabs, and pagination.
- `/orders/:orderId` - complete order record, contact links, allowed notes, and timeline.
- `/orders/new` - manual WhatsApp/phone/other order creation using live offer data and server pricing.

### 6. Tests added and current result

- Fresh local database reset: passed with all six migrations.
- pgTAP: 8 files, 132 assertions passed; Step 6 adds 18 assertions for atomic creation, authoritative pricing, actor audit, search/filter/pagination, detail aggregation, note audit, and permission denial.
- Supabase database lint: no schema errors.
- Vitest/Testing Library: 8 files, 16 tests passed.
- Strict TypeScript: passed.
- ESLint with zero warnings: passed.
- Prettier check: passed.
- Vite production build: passed (146 modules); the existing non-blocking single-chunk size warning remains.
- Playwright in installed Chrome: 2 smoke tests passed.

### 7. How to run/verify locally

```powershell
npm.cmd run supabase:start
npm.cmd run dev
```

Sign in at `http://127.0.0.1:5173/login`, then open `/orders` or `/orders/new`.

Full verification:

```powershell
npm.cmd run supabase:reset
npm.cmd run supabase:test
npm.cmd run supabase:types
npx.cmd supabase db lint --local --level warning
npm.cmd run format:check
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test -- --pool=threads --maxWorkers=1
npm.cmd run build
npm.cmd run test:e2e
```

### 8. Assumptions made

- Manual orders are limited to `WHATSAPP`, `PHONE`, and `OTHER`; acquisition landing-page channels must continue through the public Edge Function.
- A manual order is initially assigned to the authenticated creator.
- Search matches the final ten Nigerian subscriber digits so formatted `080...` input finds stored `+234...` numbers.
- Existing-customer contact/address fields are refreshed from the latest manual order, while each delivery keeps its own historical snapshot.

### 9. Open blockers/TODOs

- No Step 6 implementation blocker remains.
- A local database reset intentionally removes local Auth users. Re-run the documented Executive Admin bootstrap and Order Manager invitation after any reset.
- Workflow status buttons are intentionally deferred to Step 7; the current detail screen displays state but cannot bypass the future command functions.

### 10. Recommended next step

Approve Step 7: authoritative contact, unreachable, confirm, cancel, complete, and Executive Admin override commands with UI actions and timeline updates.

---

## STEP COMPLETED: Step 7 - Order state RPC commands and audit timeline

Status: complete. Normal browser credentials cannot create an unsupported order state, and every successful state command records one immutable actor-attributed event in the same transaction.

### 1. What was implemented

- Added authoritative commands for contacted, unreachable, confirmed, cancelled, and completed states.
- Each command derives `auth.uid()`, checks its dedicated permission, locks the order row, validates the current state, applies the transition, and writes the audit event atomically.
- Confirmation verifies customer identity/phone, item presence, positive effective total, and complete delivery information.
- Cancellation accepts only the approved reason catalog, requires a note for `OTHER`, records the cancellation timestamp, and rejects delivered/returned orders.
- Completion requires a confirmed order with delivery `DELIVERED` and payment `PAID`.
- Added a separate Executive Admin override command gated by `order.override`, a changed target status, and a meaningful reason. Overrides emit `ORDER_STATUS_OVERRIDDEN` rather than a normal workflow event.
- Added context-aware order-detail actions, a confirmation review dialog, cancellation reason collection, completion gating, an Executive-only override dialog, and automatic detail/queue refresh after successful commands.

### 2. Files/modules changed

- `supabase/migrations/20261013000700_order_workflow.sql`
- `supabase/tests/080_order_workflow.test.sql`
- `src/features/orders/api.ts`
- `src/features/orders/OrderWorkflowActions.tsx`
- `src/features/orders/OrderWorkflowActions.test.tsx`
- `src/features/orders/OrderDetailPage.tsx`
- `src/styles.css`
- `src/types/database.ts`

### 3. Database migrations

- `20261013000700_order_workflow.sql`: six permission-checked order workflow functions with row locking, state validation, atomic updates, least-privilege grants, and immutable event creation.

### 4. Supabase tables/views/RPCs/Edge Functions added/changed

RPC functions:

- `mark_order_contacted(uuid)`
- `mark_order_unreachable(uuid)`
- `confirm_order(uuid)`
- `cancel_order(uuid, text, text)`
- `complete_order(uuid)`
- `override_order_status(uuid, order_status, text)`

No table, view, or Edge Function change was required.

### 5. UI routes/screens added/changed

- `/orders/:orderId` now exposes only actions valid for the current state and the server-returned permission set.
- Confirmation displays the customer, phone, package, total, payment method, and delivery address before submission.
- Cancellation and override actions collect required structured reasons; override controls are absent for Order Managers.
- The existing immutable timeline refreshes after every successful workflow command.

### 6. Tests added and current result

- Fresh local database reset: passed with all seven migrations.
- pgTAP: 9 files, 159 assertions passed; Step 7 adds 27 transition/security assertions.
- Coverage includes every documented normal status edge, invalid transitions, direct status-write denial, confirmation/completion requirements, reason storage, exactly-one-event behavior, actor attribution, Order Manager override denial, and reasoned Executive override.
- Supabase database lint at warning level: no schema errors.
- Vitest/Testing Library: 9 files, 17 tests passed.
- Strict TypeScript: passed.
- ESLint with zero warnings: passed.
- Prettier check: passed.
- Production build: passed (147 modules), with the existing non-blocking single-chunk size warning.
- Playwright in installed Chrome: 2 smoke tests passed.

### 7. How to run/verify locally

```powershell
npm.cmd run supabase:start
npm.cmd run dev
```

After bootstrapping local staff again, sign in, create/open an order, and use the context-aware action panel on `/orders/:orderId`.

### 8. Assumptions made

- `order.confirm` authorizes normal completion because the supplied permission catalog has no separate `order.complete` capability; completion still independently requires delivered and paid state.
- Cancellation remains allowed after dispatch but only before delivery, matching the specification's "before final delivery" rule.
- Executive override may target any order status, but only through the explicit exception function with a reason and override audit event.
- Delivery and payment state changes remain deferred to Steps 8 and 9; Step 7 consumes their eventual authoritative states for completion.

### 9. Open blockers/TODOs

- No Step 7 technical blocker remains.
- The fresh verification reset removed local Auth users again; rerun the documented admin bootstrap/invitation before manual sign-in testing.
- The existing bundle-size warning is non-blocking; route-level code splitting remains a release-hardening optimization.

### 10. Recommended next step

Approve Step 8: delivery scheduling, rescheduling, dispatch, delivered/failed outcomes, reason capture, and delivery timeline UI.

---

## STEP COMPLETED: Step 8 - Delivery workflow

Status: complete. A confirmed order can move through scheduling, dispatch, and successful or failed delivery through audited, permission-checked database commands and context-aware UI controls.

### 1. What was implemented

- Added authoritative scheduling that accepts `NOT_SCHEDULED`, `SCHEDULED` rescheduling, and `FAILED` retry paths only for confirmed orders.
- Scheduling validates the date and full recipient/address snapshot, normalizes the phone, clears stale courier/failure/outcome fields, and emits distinct scheduled, rescheduled, or retry events.
- Added dispatch for scheduled confirmed deliveries with optional courier, normalized courier phone, tracking reference, and dispatch note.
- Added successful-delivery recording only after dispatch. It intentionally leaves COD payment unchanged.
- Added failed-delivery recording only after dispatch with a controlled reason catalog and mandatory note for `OTHER`.
- Added a permission-checked attention queue for the selected day's scheduled/dispatched work plus all failed deliveries requiring action.
- Added scheduling/rescheduling/retry, dispatch, delivered, and failed-delivery dialogs to order detail, along with automatic detail/order/queue refresh.
- Added today's delivery and failed-delivery attention panels to the main orders workspace and an explicit unpaid-COD prompt after successful delivery.

### 2. Files/modules changed

- `supabase/migrations/20261013000800_delivery_workflow.sql`
- `supabase/tests/090_delivery_workflow.test.sql`
- `src/features/orders/api.ts`
- `src/features/orders/DeliveryWorkflowActions.tsx`
- `src/features/orders/DeliveryWorkflowActions.test.tsx`
- `src/features/orders/OrderDetailPage.tsx`
- `src/features/orders/OrdersPage.tsx`
- `src/features/orders/OrdersPage.test.tsx`
- `src/styles.css`
- `src/types/database.ts`

### 3. Database migrations

- `20261013000800_delivery_workflow.sql`: delivery transition commands, address/courier/reason validation, actor-attributed immutable events, least-privilege grants, and delivery-attention queue RPC.

### 4. Supabase tables/views/RPCs/Edge Functions added/changed

RPC functions:

- `schedule_delivery(...)`
- `dispatch_order(...)`
- `mark_order_delivered(uuid, text)`
- `fail_delivery(uuid, text, text)`
- `list_delivery_attention(date)`

No table, view, or Edge Function change was required.

### 5. UI routes/screens added/changed

- `/orders/:orderId` now includes valid permission-aware delivery controls, delivery snapshot confirmation, courier context, failure reasons, retry scheduling, and a COD reconciliation prompt.
- `/orders` now shows today's scheduled/dispatched deliveries and failed deliveries requiring retry before the full order queue.

### 6. Tests added and current result

- Fresh local database reset: passed with all eight migrations.
- pgTAP: 10 files, 188 assertions passed; Step 8 adds 29 delivery workflow/security assertions.
- Coverage includes unconfirmed scheduling denial, scheduling/rescheduling, snapshot changes, unscheduled dispatch denial, courier normalization, undispatched-delivery denial, successful delivery, COD non-payment, failure reason enforcement, retry cleanup, attention queues, direct-write denial, permission denial, and actor attribution.
- Supabase database lint at warning level: no schema errors.
- Vitest/Testing Library: 10 files, 18 tests passed; the updated order-queue delivery panels also pass their focused regression after final fixture refinement.
- Strict TypeScript: passed.
- ESLint with zero warnings: passed.
- Prettier check: passed.
- Production build: passed (148 modules), with the existing non-blocking single-chunk size warning.
- Playwright in installed Chrome: 2 smoke tests passed.

### 7. How to run/verify locally

```powershell
npm.cmd run supabase:start
npm.cmd run dev
```

After bootstrapping local staff again, create and confirm an order, then use its delivery workflow panel to schedule, dispatch, and record an outcome.

### 8. Assumptions made

- Delivery scheduling permits the current date and later dates, not past dates.
- Courier name, phone, and tracking reference remain optional because the specification qualifies them as required "where known."
- Only a dispatched delivery can normally succeed or fail. Failed deliveries can retry by returning to `SCHEDULED`.
- Successful COD delivery does not imply payment collection; payment remains `UNPAID` until the Step 9 trusted payment command runs.
- Today's queue includes `SCHEDULED` and `DISPATCHED`; the failure queue includes all `FAILED` deliveries regardless of their original scheduled date.

### 9. Open blockers/TODOs

- No Step 8 technical blocker remains.
- The fresh verification reset removed local Auth users again; rerun the documented admin bootstrap/invitation before manual sign-in testing.
- Delivery returns remain represented in the schema but are outside the explicit Step 8 V1 command list.

### 10. Recommended next step

Approve Step 9: COD payment reconciliation, completion integration, and provider-ready prepaid initialization/webhook architecture.

---

## STEP COMPLETED: Step 9 - Payment workflow

Status: complete. Delivered COD orders can be reconciled and completed end-to-end, while prepaid
payments use a test-only provider adapter and can become paid only through a verified, idempotent
server-side webhook.

### 1. What was implemented

- Added `mark_cod_paid`, gated by `payment.update`, delivered/confirmed state, COD method, row
  locking, and an actor-attributed payment audit event. Repeated calls safely return `PAID` without
  duplicating the event.
- Preserved the normal completion invariant: the order must be confirmed, delivery must be
  `DELIVERED`, and payment must be `PAID`.
- Added a private provider-event ledger with provider/event uniqueness, payload hashes, processing
  state, RLS, and no browser grants.
- Added service-only prepaid initialization and provider-event RPCs. Initialization rechecks the
  authorized staff actor and remains idempotent; provider events verify the reference, amount, and
  currency before applying a state transition.
- Protected paid state from late failure events and protected event ids from reuse with altered
  data.
- Added a shared payment-provider interface and local mock adapter. Mock mode is automatically
  available only on the local stack unless explicitly enabled outside local development.
- Added an authenticated prepaid-initialization Edge Function and an unauthenticated webhook route
  that requires an HMAC-SHA256 signature over the exact raw request body. Raw webhook bodies and
  payment-card data are not stored.
- Added permission-aware payment controls to order detail: a COD confirmation dialog with optional
  collection note and a clearly labeled test prepaid initializer. The browser has no generic
  "mark prepaid paid" action.

### 2. Files/modules changed

- `supabase/migrations/20261013000900_payment_workflow.sql`
- `supabase/tests/100_payment_workflow.test.sql`
- `supabase/functions/_shared/payments.ts`
- `supabase/functions/initialize-prepaid-payment/index.ts`
- `supabase/functions/payment-webhook-mock/index.ts`
- `supabase/functions/README.md`
- `supabase/config.toml`
- `src/features/orders/api.ts`
- `src/features/orders/PaymentActions.tsx`
- `src/features/orders/PaymentActions.test.tsx`
- `src/features/orders/DeliveryWorkflowActions.tsx`
- `src/features/orders/OrderDetailPage.tsx`
- `src/styles.css`
- `src/types/database.ts`
- `README.md`

### 3. Database migrations

- `20261013000900_payment_workflow.sql`: private provider-event ledger, provider-reference
  uniqueness, COD reconciliation, prepaid initialization, verified provider-event processing,
  idempotency, audit events, and least-privilege grants.

### 4. Supabase tables/RPCs/Edge Functions added

Table:

- `payment_provider_events`

RPC functions:

- `mark_cod_paid(uuid, text)` for authenticated staff with `payment.update`.
- `initialize_prepaid_payment(uuid, text, text, uuid)` for the service role only.
- `record_provider_payment_event(text, text, text, text, bigint, character, text)` for the service
  role only.

Edge Functions:

- `initialize-prepaid-payment` (`verify_jwt = true`).
- `payment-webhook-mock` (`verify_jwt = false`, with application-level HMAC verification).

### 5. UI routes/screens changed

- `/orders/:orderId` now shows COD reconciliation after successful delivery when authorized.
- Pending prepaid orders expose test-provider initialization and display the returned reference,
  while explicitly warning that initialization is not payment confirmation.
- Paid orders show their reconciled state and unlock the existing completion action.

### 6. Tests and verification

- Fresh local database reset: passed with all nine migrations.
- pgTAP: 11 files, 219 assertions passed; Step 9 adds 31 payment, authorization, transition,
  completion, mismatch, idempotency, replay, and late-event assertions.
- Live webhook probes: invalid HMAC returned `401 INVALID_SIGNATURE`; a valid HMAC passed signature
  verification and reached provider-reference lookup (`404 PAYMENT_NOT_FOUND` for the deliberate
  unknown reference).
- Live prepaid initialization probe without a JWT returned `401` at the Edge gateway.
- Supabase database lint: no schema errors.
- Vitest/Testing Library: 11 files, 21 tests passed.
- Strict TypeScript: passed.
- ESLint with zero warnings: passed.
- Prettier check: passed.
- Production build: passed (149 modules), with the existing non-blocking single-chunk size warning.
- Playwright in installed Chrome: 2 smoke tests passed.

### 7. How to run/verify locally

```powershell
npm.cmd run supabase:start
npm.cmd run dev
```

Create a COD order and move it through confirmation, scheduling, dispatch, and delivery. The payment
panel will then permit an authorized Order Manager to confirm collection; the order-completion
action becomes available only after that succeeds.

For prepaid testing, initialize the payment from the order detail page and submit a signed mock
webhook as described in `supabase/functions/README.md`. Never use the checked-in local fallback
secret outside the local stack.

### 8. Assumptions made

- No production payment provider was selected, so Step 9 uses the specification's safe mock/test
  fallback rather than inventing a production success path.
- `payment.update` authorizes COD reconciliation and prepaid initialization; verified webhook state
  changes are service-only and have no human actor.
- A valid late success may recover a previously failed prepaid attempt, but a late failure cannot
  downgrade an already paid payment.
- Provider event bodies are represented by SHA-256 hashes in the idempotency ledger; only minimal
  provider/event identifiers enter audit metadata.

### 9. Open blockers/TODOs

- Select and implement a real payment provider adapter, hosted webhook secret, and production
  provider-specific signature scheme before enabling prepaid collection in production.
- The final reset removed local Auth users again; rerun the documented Executive Admin bootstrap
  and invite the Order Manager before manual sign-in testing.
- The existing bundle-size warning is non-blocking; route-level code splitting remains a
  release-hardening optimization.

### 10. Recommended next step

Proceed to Step 10: the RLS-protected customer list, customer detail, order history, and paid-spend
aggregates.

---

## STEP COMPLETED: Step 10 - Customers module

Status: complete. Authorized staff can search and page through customers, inspect repeat-customer
operational history, and follow customer/order links in both directions.

### 1. What was implemented

- Added a permission-checked paginated customer-list RPC with independent name and normalized-phone
  search.
- Added customer-level total orders, delivered orders, latest order date/status, and paid-only spend
  aggregates.
- Added a permission-checked customer-detail RPC with contact/location data, total/delivered/
  cancelled/failed counts, paid spend, first and most recent acquisition sources, and newest-first
  order history.
- Added `/customers` with search, operational aggregates, paid-spend display, and pagination.
- Added `/customers/:customerId` with contact actions, summary cards, acquisition context, and order
  history links.
- Linked customer names from order detail back to customer detail.
- Made the existing RLS fixture robust to persistent local administrators, allowing verification
  without deleting the newly bootstrapped admin account.

### 2. Files/modules changed

- `supabase/migrations/20261013001000_customers_module.sql`
- `supabase/migrations/20261013001100_customer_search_fix.sql`
- `supabase/tests/020_rls.test.sql`
- `supabase/tests/110_customers_module.test.sql`
- `src/features/customers/api.ts`
- `src/features/customers/CustomersPage.tsx`
- `src/features/customers/CustomersPage.test.tsx`
- `src/features/customers/CustomerDetailPage.tsx`
- `src/features/customers/CustomerDetailPage.test.tsx`
- `src/features/orders/OrderDetailPage.tsx`
- `src/app/router.tsx`
- `src/styles.css`
- `src/types/database.ts`
- `scripts/README.md`
- `vitest.config.ts`

### 3. Database migrations

- `20261013001000_customers_module.sql`: customer list/detail RPCs, aggregates, permission checks,
  pagination, and least-privilege grants.
- `20261013001100_customer_search_fix.sql`: prevents name searches from becoming empty phone-fragment
  matches.

### 4. Supabase RPCs added

- `list_customers(text, integer, integer)`.
- `get_customer_detail(uuid)`.

No public table write grants or Edge Functions were added for this step.

### 5. UI routes/screens added or changed

- `/customers`: searchable, paginated customer list.
- `/customers/:customerId`: customer contact, location, acquisition summary, operational metrics,
  paid spend, and complete order history.
- `/orders/:orderId`: customer name now links to the corresponding customer detail.

### 6. Tests and verification

- Both migrations were applied incrementally so the recreated local Executive Admin was preserved.
- pgTAP: 12 files, 243 assertions passed; Step 10 adds 24 customer aggregation, spend, search,
  pagination, history, acquisition, not-found, and authorization assertions.
- Supabase database lint: no schema errors.
- Vitest/Testing Library: 13 files, 23 tests passed.
- Vitest files run serially to avoid Windows worker contention and cross-file mock timing failures.
- Strict TypeScript: passed.
- ESLint with zero warnings: passed.
- Prettier check: passed.
- Production build: passed (152 modules), with the existing non-blocking single-chunk size warning.
- Playwright in installed Chrome: 2 smoke tests passed.

### 7. How to run/verify locally

Sign in as either active staff role and open `/customers`. Search by a customer name or phone,
open the customer, and follow an order-history entry to its order detail. The order's customer name
links back to the same customer record.

### 8. Assumptions made

- Paid spend counts payments currently in `PAID`; unpaid, pending, failed, and refunded records are
  excluded.
- Delivered counts follow delivery state even if a delivered COD order still awaits reconciliation.
- Acquisition sources are derived from chronological order history, with order id as the stable tie
  breaker.
- V1 seed/catalog currency is NGN. The RPC still returns the stored order currency for formatting.

### 9. Open blockers/TODOs

- No Step 10 technical blocker remains.
- Staff invitation is available through the protected backend and documented PowerShell flow; the
  visual staff-administration screen remains scheduled for Step 12.
- The existing bundle-size warning remains a release-hardening optimization.

### 10. Recommended next step

Proceed to Step 11: security-aware Operations and Executive dashboards with server-derived metrics
and source/channel reporting.

---

## STEP COMPLETED: Step 11 - Operations and Executive dashboards

Status: implemented. Each active role receives server-derived dashboard information appropriate to
its permissions, with Executive financial and attribution metrics isolated behind
`dashboard.executive.read`.

### 1. What was implemented

- Added the Operations dashboard RPC for a selected Lagos business date, with counts for new,
  contacted/awaiting-confirmation, unreachable, scheduled, dispatched, and failed-delivery work.
- Added bounded operational queues for newest unhandled orders, orders awaiting confirmation for
  more than 24 hours, the selected day's deliveries, and failed deliveries requiring action.
- Added the Executive dashboard RPC for an inclusive date range of at most 367 days.
- Added submitted, confirmed, delivered, completed, paid, cancelled, and failed counts; submitted,
  delivered, and collected value; COD success, cancellation, failure, and funnel-conversion rates.
- Added source/channel breakdown with submitted/delivered/paid counts and submitted/paid value.
- Replaced the dashboard placeholder with role-aware Operations and Executive sections, selectable
  dates, linked work queues, financial cards, funnel cards, and a source-performance table.
- Deliberately omitted CAC because no ad-spend dataset exists.

### 2. Files/modules changed

- `supabase/migrations/20261013001200_dashboards.sql`
- `src/features/dashboard/api.ts`
- `src/features/dashboard/DashboardPage.tsx`
- `src/app/router.tsx`
- `src/styles.css`
- `src/types/database.ts`
- `IMPLEMENTATION_STATUS.md`

### 3. Database migration and RPCs

- `20261013001200_dashboards.sql` adds a partial dispatched-time index and two fixed-search-path,
  permission-checked read RPCs:
  - `get_operations_dashboard(date)`
  - `get_executive_dashboard(date, date)`

### 4. UI route changed

- `/dashboard` now renders Operations content for `dashboard.operations.read` and adds the
  Executive section only for `dashboard.executive.read`.

### 5. Verification performed

- Migration applied incrementally; local users and data were not reset.
- Read-only RPC smoke check as the local Executive Admin returned valid Operations and Executive
  metric objects.
- Supabase database lint: no schema errors.
- Strict TypeScript: passed.
- Prettier check: passed.
- Production build: passed (154 modules), with the existing non-blocking chunk-size warning.
- The full automated suites were not rerun for this step at the user's request to skip testing and
  continue implementation.

### 6. Metric definitions and assumptions

- Business-day boundaries use `Africa/Lagos`.
- Awaiting confirmation means the current order state is `CONTACTED`; unreachable remains a
  separate operational metric.
- Delivered value sums order value for deliveries currently `DELIVERED`; collected revenue sums
  payment amounts currently `PAID`.
- COD success uses delivered outcomes divided by COD deliveries with a final `DELIVERED` or
  `FAILED` outcome.
- Funnel rates use submitted orders in the selected period as the denominator and current
  confirmed/completed, delivered, or paid state as each numerator.
- Refunded payments are excluded from collected revenue.

### 7. Recommended next step

Proceed to Step 12: the visual Staff administration screen, role/access management, settings, and
optional offer configuration.

---

## STEP COMPLETED: Step 12 - Staff management, settings, and offers

Status: implemented. Executive Admin can perform normal staff, operational-setting, and offer
administration from the application without editing Supabase tables manually.

### 1. What was implemented

- Added a permission-protected, searchable staff directory and invitation form.
- Added audited role replacement and active/inactive controls. Self-role changes and
  self-deactivation are blocked; deactivation removes Auth sessions and applies the existing Auth
  ban workflow.
- Added an Executive-only route guard in addition to hidden navigation and database authorization.
- Added a deliberately small operational settings record for the duplicate-warning window, fixed
  NGN currency, and business contact details.
- Connected the configured duplicate-warning window to both public and staff-created orders.
- Added offer activation, standard price, optional prepaid price, and display-order editing.
- Offer updates keep the single V1 priced product line consistent with the headline price, require
  at least one active offer, preserve historical order snapshots, and emit an immutable audit event.

### 2. Files/modules changed

- `supabase/migrations/20261013001300_staff_settings.sql`
- `supabase/migrations/20261013001400_offer_configuration_consistency.sql`
- `supabase/functions/update-staff-role/index.ts`
- `supabase/config.toml`
- `src/features/staff/api.ts`
- `src/features/staff/StaffPage.tsx`
- `src/features/settings/api.ts`
- `src/features/settings/SettingsPage.tsx`
- `src/features/auth/AuthGuards.tsx`
- `src/app/router.tsx`
- `src/styles.css`
- `src/types/database.ts`

### 3. Database and Edge surface

- Browser reads: `list_staff`, `get_operational_settings`, and `list_offer_configuration`.
- Audited browser commands: `update_operational_settings` and `update_offer_configuration`.
- Service-role-only command: `set_staff_role`, called only by the authorized `update-staff-role`
  Edge Function.
- Existing `invite-staff` and `update-staff-access` Edge Functions are now available through the UI.

### 4. Routes

- `/staff`: search, invite, assign role, activate, and deactivate.
- `/settings`: operational defaults, business contact, and offer configuration.
- Direct navigation without the corresponding read permission redirects to `/dashboard`.

### 5. Verification performed

- Both migrations applied incrementally; existing users and local data were not reset.
- Supabase database lint: no schema errors.
- Authorized RPC smoke checks returned one local staff record, three offers, and a valid settings
  object.
- Browser-role execution of the service-only role command is denied.
- Public and manual order function definitions both use the stored duplicate-warning window.
- A transaction-rolled-back offer edit produced a valid checkout price and an audit event.
- Strict TypeScript and the production build passed (158 modules).
- Targeted ESLint for all changed frontend modules passed with zero warnings.
- The full automated test suites were not rerun at the user's request to skip testing and continue
  implementation.

### 6. Local use

Sign in as Executive Admin and open `/staff` or `/settings`. Local staff invitations are captured by
the local mail service; accept the invitation link at `/invite`, set the password, then sign in with
the invited email. Order Managers cannot open either administration route or call its protected
database commands.

### 7. Recommended next step

Proceed to Step 13: production hardening, hosted Supabase configuration, secrets/payment-provider
readiness, observability, release checks, and deployment documentation.

---

## STEP 13 CHECKPOINT: Production hardening and release

Status: local/repository hardening complete; production approval is pending hosted configuration
and external business decisions listed below.

### COD-only production decision (2026-10-15)

- The initial hosted release is COD-only. Prepaid controls were removed from public and staff order
  creation and from editable offer settings.
- A database launch gate rejects new prepaid orders even when a caller bypasses the frontend, and
  the public order Edge Function validates `COD` as the only accepted payment method.
- The prepaid schema and provider workflow remain available for a future reviewed forward
  migration; the mock provider must not be deployed to production.

### 1. Security and configuration hardening

- Hosted Edge Functions now fail closed when `ALLOWED_ORIGINS` is missing/invalid; hosted origins
  must use HTTPS.
- Public order intake requires a private rate-limit salt of at least 32 characters outside local
  Supabase. The local fallback cannot be used on a hosted project.
- Staff invitation redirects must resolve to an explicitly allowed application origin.
- Edge JSON responses now set no-store, no-referrer, and content-type-sniffing protection headers.
- Unexpected Edge errors emit only structured error kind/provider code, not request bodies, phone
  numbers, addresses, tokens, or database error messages.
- Production frontend configuration requires HTTPS and rejects a browser origin that does not match
  `VITE_APP_ORIGIN` when `VITE_DEPLOYMENT_ENV=production`.
- Remote Executive Admin bootstrap now requires HTTPS, the exact hosted project ref, and an
  account-specific confirmation string in addition to the explicit remote-enable flag.
- Added a browser source/bundle scan that fails on privileged service-role/payment secret names.

### 2. Database security and performance

- Added a release-security pgTAP file covering RLS on every public table, fixed empty search paths
  on every public `SECURITY DEFINER` function, service-role staff command isolation, and direct
  settings/payment/rate-limit table denial.
- Made older database tests fixture-scoped so they pass without resetting a non-empty local
  database or deleting the local administrator.
- Added trigram indexes for customer name/phone, order number, and staff name/email contains search.
- Changed order enum filtering to preserve index eligibility instead of casting indexed columns to
  text.
- Local `EXPLAIN` checks selected the new search indexes. Production-volume latency still requires
  a staging dataset.

### 3. Operational release tooling and documentation

- Added `npm run security:client-secrets` and the combined `npm run release:check` gate.
- Added browser-safe production environment template, hosted Supabase/Edge setup instructions,
  admin-bootstrap safeguards, observability guidance, backup/recovery notes, and forward-only
  rollback procedure under `deployment/`.
- Added `RELEASE_CHECKLIST.md` and dated local evidence in `RELEASE_EVIDENCE.md`.

### 4. Verification results

- npm production and full dependency audits: 0 vulnerabilities.
- Release gate: secret scan, TypeScript, full ESLint, Prettier, 24 Vitest tests, and production build
  all passed.
- Supabase database lint: no schema errors.
- pgTAP: 13 files and 252 assertions passed.
- Edge runtime smoke: allowed CORS preflight 204, blocked origin 403, invalid payload 422.
- Playwright: both installed-Chrome smoke flows passed serially against the built preview. The
  default Windows-managed preview cleanup hung after completing tests; the isolated preview run
  passed and its process/port were cleaned up.
- Production build transformed 158 modules. The existing bundle-size warning remains an
  optimization, not a correctness failure.

### 5. Production release blockers

- Provide the canonical HTTPS application domain and hosted Supabase project ref, then verify Auth
  URLs, SMTP, Edge secrets, Security Advisor, logs, backups, and deployment dry-run in that project.
- Select and implement a real prepaid provider or launch COD-only. The mock adapter remains safely
  disabled on hosted Supabase by default.
- Choose backup/PITR, restore, alerting, privacy-retention, and release owners.
- Run history secret scanning once this currently uncommitted repository has a canonical Git
  history.
- Validate query latency with representative staging volume.

Do not mark production release approved until every required item in `RELEASE_CHECKLIST.md` has
recorded hosted evidence.
