# Release evidence - 2026-10-14

## COD-only launch decision - 2026-10-15

- V1 production launch is COD-only. The public and staff order forms submit COD without offering
  prepaid.
- Migration `20261015001600_cod_only_launch.sql` adds a server-side launch gate that rejects new
  prepaid orders while preserving the provider-ready schema for a future forward migration.
- The public order Edge Function independently accepts only `COD`.
- Production build passed, Vitest passed 13 files/24 tests, and pgTAP passed 13 files/253
  assertions, including the COD-only server gate.
- The project owner selected the Supabase Free plan and accepts operating without managed backup
  or PITR for the initial SME launch.

This record covers the local release candidate in `C:\Users\TM\Desktop\nouri-app`. It is not a
substitute for the hosted checks in `RELEASE_CHECKLIST.md`.

## Passed

- Production dependency audit: 0 vulnerabilities.
- Full dependency audit, including development tooling: 0 vulnerabilities.
- Browser source/bundle privileged-secret-name scan: passed.
- Strict TypeScript: passed.
- ESLint with zero warnings: passed.
- Prettier check: passed.
- Vitest: 13 files, 24 tests passed.
- Production build: 158 modules; existing non-blocking bundle-size warning remains.
- Supabase database lint: no schema errors.
- pgTAP: 13 files, 252 assertions passed on the preserved non-empty local database.
- Playwright: 2 Chrome smoke flows passed serially against the built preview.
- Edge runtime smoke: allowed preflight 204, disallowed origin 403, invalid public payload 422.
- Search-plan checks: customer-name, order-number, and staff-email searches selected their trigram
  indexes when sequential scans were disabled to verify index eligibility.
- Order status/source/payment filters were changed to compare enum values directly so existing
  B-tree indexes remain eligible.

## Environment note

The standard Playwright command completed both tests but hung during Windows-managed preview-server
cleanup. Running the same tests against a separately started preview server with one worker passed
in 5.5 seconds; the temporary server was stopped and port 4173 was verified free.

## Release blockers requiring external decisions or access

- No canonical production application origin or hosted Supabase project ref was supplied, so Auth
  redirects, hosted CORS, SMTP, Security Advisor, and Edge secrets cannot be verified here.
- No real prepaid provider was selected. The mock adapter is fail-closed outside local Supabase;
  production must remain COD-only until a real provider and webhook pass review.
- Backup/PITR tier, restore owner, error-log destination, alert owner, and retention policy require
  production account configuration.
- This local repository has no commits, so repository-history secret scanning must run after the
  canonical remote/history exists.
- Production-like row volume was unavailable. Index eligibility is verified, but response-time and
  deep-pagination load thresholds still require staging data.
