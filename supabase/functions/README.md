# Supabase Edge Functions

The local stack injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` automatically. Never copy the service-role key into a `VITE_` variable or browser code.

Before deploying `create-public-order`, configure a private, high-entropy `RATE_LIMIT_SALT` Edge Function secret. It is combined with the forwarded client address before the rate-limit bucket key is hashed, so raw client addresses are not stored in Postgres.

Also configure `ALLOWED_ORIGINS` as a comma-separated list of the production/staging web origins. `APP_ORIGIN` remains required by staff invitation redirects in hosted environments.

Hosted functions fail closed when these values are missing or malformed. `RATE_LIMIT_SALT` must be
at least 32 characters and hosted origins must use HTTPS. Example deployment preparation (provide
real values through the secure deployment environment, not a committed file):

```powershell
supabase secrets set RATE_LIMIT_SALT=<random-secret> ALLOWED_ORIGINS=https://example.com APP_ORIGIN=https://example.com
```

The checked-in local fallback salt is development-only.

## Payment provider adapter

`initialize-prepaid-payment` currently uses the mock adapter only. It is available automatically
against local Supabase and never marks a payment paid. A prepaid payment changes to `PAID` only
after `payment-webhook-mock` verifies an HMAC-SHA256 signature over the exact raw request body.

Local webhook requests use `nouri-local-mock-webhook-secret`. For any non-local environment, the
mock adapter remains disabled unless `ALLOW_MOCK_PAYMENT_PROVIDER=true`, and
`MOCK_PAYMENT_WEBHOOK_SECRET` must be set explicitly. This adapter is for integration testing, not
real collections. Select and implement a production provider before accepting prepaid orders in
production.

To confirm a locally initialized payment, replace the reference and amount below with the values
shown in the order/payment record. The amount is in minor units (kobo):

```powershell
$body = '{"id":"event_local_001","reference":"mock_reference_from_ui","type":"payment.succeeded","amount":4200000,"currency":"NGN"}'
$secretBytes = [Text.Encoding]::UTF8.GetBytes('nouri-local-mock-webhook-secret')
$hmac = [System.Security.Cryptography.HMACSHA256]::new($secretBytes)
$signature = ([BitConverter]::ToString($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($body))) -replace '-', '').ToLowerInvariant()

Invoke-WebRequest `
  -Uri 'http://127.0.0.1:55321/functions/v1/payment-webhook-mock' `
  -Method Post `
  -ContentType 'application/json' `
  -Headers @{ 'x-mock-signature' = $signature } `
  -Body $body
```

Reuse the exact same body to verify idempotent replay. Reusing the event id with changed data is
rejected.
