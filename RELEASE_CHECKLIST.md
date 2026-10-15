# Nouri V1 release checklist

Record the date, operator, project ref, frontend release identifier, and evidence link for each run.

## Security and configuration

- [ ] Canonical HTTPS frontend origin is final.
- [ ] Hosted Auth Site URL and exact invite/reset redirect URLs are verified.
- [ ] Public signup is disabled; password policy and production SMTP are configured.
- [ ] `ALLOWED_ORIGINS`, `APP_ORIGIN`, and a random 32+ character `RATE_LIMIT_SALT` are set.
- [ ] No mock payment flags/secrets are enabled in production.
- [ ] Prepaid is not offered until a real provider adapter and signed webhook have passed review.
- [ ] `npm run security:client-secrets` passes after the production build.
- [ ] Repository/history secret scan passes in the canonical remote repository.
- [ ] Supabase Security Advisor has no unresolved release-blocking findings.

## Database and performance

- [ ] Every exposed table has RLS and every privileged function has a fixed `search_path`.
- [ ] `npm run supabase:test` and local database lint pass from a clean migration reset.
- [ ] Pending migrations and `supabase db push --dry-run` output are reviewed.
- [ ] Latest backup is verified; PITR/restore ownership and rollback window are recorded.
- [ ] Order/customer list, dashboard, and operational queue plans use expected indexes with
      representative production-like row counts.
- [ ] Pagination and dashboard response times meet the agreed operational threshold.

## Application and operations

- [ ] `npm run release:check` passes from a clean install.
- [ ] Critical Playwright flows pass against the release candidate.
- [ ] Executive Admin login, invitation, deactivation, and role change are verified.
- [ ] Public COD order through delivery/payment completion is verified.
- [ ] Logs/alerts are connected and contain no phone, address, token, password, or request body.
- [ ] Frontend and Edge rollback artifacts are identified.
- [ ] Post-deploy smoke checks and release owner are scheduled.

Do not approve release with an unchecked security, backup, migration, or payment item. External
hosted-project items cannot be validated from the local repository and require recorded evidence.
