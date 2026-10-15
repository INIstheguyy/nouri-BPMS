# Nouri Operations V1 - IDE Agent Kickoff

You are implementing **Nouri Operations V1**.

## Locked technology stack

This project uses:

- **Frontend:** React + TypeScript + Vite.
- **Backend platform:** Supabase.
- **Database:** Supabase Postgres.
- **Authentication:** Supabase Auth.
- **Authorization:** Supabase Row Level Security (RLS) plus permission checks inside privileged database functions/Edge Functions.
- **Business commands / transactions:** Postgres database functions exposed through Supabase RPC.
- **Public and secret-bearing workflows:** Supabase Edge Functions.
- **Client SDK:** `@supabase/supabase-js`.
- **Testing:** Vitest + Supabase local/integration tests + Playwright for critical E2E flows.

**Do not scaffold Express, Prisma, a custom Node API server, Firebase, or another backend platform.** Do not expose the Supabase service-role key or payment secrets to browser code.

## Source of truth

Read `NOURI_V1_PRD_TECH_SPEC.md` completely before changing code. Treat it as the product requirements, technical specification, security/RLS reference, business-rule reference, and implementation order.

## Working method

1. Begin with **Step 0 - Repository and Supabase audit**.
2. Inspect the existing repository before introducing libraries or architecture.
3. Reuse an existing compatible React/Supabase setup rather than creating a competing stack.
4. Implement one numbered step at a time in the exact order defined in the spec.
5. Build **vertical, runnable slices**: migration/RLS + database function or Edge Function + frontend + tests where the step requires them.
6. Do not implement Phase 2/deferred features unless required to make a V1 flow work.
7. Never trust frontend-supplied order price, payment success, role, permission, or workflow state.
8. Enable and test RLS on every exposed operational table.
9. Use explicit database RPC/business commands for order, delivery, and payment transitions. Do not allow arbitrary status mutation from the React client.
10. Record audit/order events for important state changes in the same transaction where possible.
11. Never use `SUPABASE_SERVICE_ROLE_KEY` in React, Vite `VITE_*` variables, or any code bundled for the browser.
12. Use Edge Functions only where public access, Supabase Admin Auth, payment/webhook secrets, or other trusted server-side capabilities are required.
13. Preserve Supabase migrations. Never edit an already-applied production migration; create a new migration.
14. Do not move past a failing migration, broken build, failing RLS/security test, failing critical test, or unresolved security issue without reporting it.

## First task

Perform **Step 0 only** now:

- inspect repository structure;
- confirm React/TypeScript/Vite setup;
- locate Supabase client/configuration;
- locate `supabase/config.toml`, migrations, seed data, Edge Functions, generated DB types, and environment patterns if present;
- identify current Supabase Auth/RLS/roles state;
- identify frontend routing, state/data layer, component system, testing, linting, formatting, and deployment setup;
- run existing build/lint/tests;
- if Supabase local tooling exists, report whether the local stack/reset can run;
- map the PRD to concrete files/modules/migrations/functions;
- list conflicts, blockers, and missing decisions;
- produce the checkpoint report below.

Do **not** start feature implementation until the Step 0 report is complete.

## Step 0 checkpoint report format

```text
STEP COMPLETED: Step 0 - Repository and Supabase audit

1. Current repository architecture
2. React / TypeScript / Vite state
3. Supabase project/configuration state
4. Existing database schema and migrations
5. Existing Supabase Auth / RLS / RBAC state
6. Existing Edge Functions / RPC functions
7. Existing build / lint / test result
8. Proposed file + migration + function mapping for Nouri V1
9. Dependencies that need to be added (with reasons)
10. Assumptions made
11. Blockers or product decisions required
12. Security/RLS risks
13. Exact plan for Step 1
```

After approval, continue with the next numbered step in `NOURI_V1_PRD_TECH_SPEC.md` and use the same checkpoint discipline after every step.
