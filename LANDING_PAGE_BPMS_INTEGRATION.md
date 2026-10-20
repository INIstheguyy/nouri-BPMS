# Landing Page to Nouri BPMS Integration Specification

Status: ready for implementation after the approval gates in this document are confirmed  
Prepared: 18 October 2026  
Systems:

- Landing page: `https://nouri-demo.netlify.app`
- Operations application: `https://nouri-bpms.netlify.app`
- Supabase project: `yssvglxoyghrnropmjyh`
- Public order endpoint:
  `https://yssvglxoyghrnropmjyh.supabase.co/functions/v1/create-public-order`

## 1. Objective

Replace the landing page's simulated order submission with real COD order creation in Nouri BPMS
while preserving the existing page design, pricing selection, WhatsApp CTAs, and single-page
conversion flow.

The completed integration must:

- collect the delivery information required by BPMS;
- map the three landing-page plans to stable BPMS offer IDs;
- submit exactly one logical order across double-clicks and safe retries;
- preserve campaign attribution;
- display the BPMS order number and next-step message only after confirmed creation;
- remove customer data from browser logs; and
- leave all price calculation, offer availability, rate limiting, and order creation authoritative on
  the BPMS backend.

## 2. Current state

The production landing page is a React 18, TypeScript, Vite 6 SPA hosted on Netlify. It has one
route and three hard-coded packages. Its embedded form currently collects only full name and
WhatsApp number, logs the lead to the console, waits 450 milliseconds, and shows a simulated
success state. It does not send data to any external destination.

Relevant landing-page files identified by the assessment:

- `src/components/sections/OrderForm.tsx`
- `src/components/sections/Pricing.tsx`
- `src/pages/LandingPage.tsx`
- `src/data/content.ts`
- `src/lib/attribution.ts`
- `src/lib/phone.ts`
- `src/lib/whatsapp.ts`

Relevant BPMS implementation:

- `supabase/functions/create-public-order/index.ts`
- `supabase/functions/_shared/cors.ts`
- `supabase/migrations/20261013000200_rbac_rls_and_seed.sql`
- `supabase/migrations/20261013000500_public_order.sql`
- `src/features/public-order/api.ts`

## 3. Locked implementation decisions

The following decisions come from the current production backend and release scope.

1. **Payment is COD only.** The landing page must send `paymentMethod: "COD"` and must not show a
   prepaid option.
2. **The browser calls the public Edge Function directly.** No service-role key, secret API key,
   authenticated staff token, or custom Node server is required.
3. **The existing one-page flow remains.** Delivery fields are added to the embedded order form;
   no checkout route is introduced in this integration.
4. **WhatsApp remains a separate conversion path.** Clicking a WhatsApp CTA does not create a
   BPMS order. The selected plan should be included in the prefilled WhatsApp message, but no order
   is recorded until staff create one through the manual-order workflow.
5. **BPMS is authoritative.** The browser sends an offer ID, never a price. The backend resolves
   availability, line items, price, totals, duplicate warnings, and the order number.
6. **Attribution source is `LANDING_PAGE`.** Raw campaign values remain in their corresponding
   attribution fields and are not converted into BPMS source enums.
7. **No customer payload is logged.** Browser and production logs must not contain names, phone
   numbers, delivery addresses, email addresses, notes, or complete request bodies.

## 4. Approval gates before coding

Implementation can start after confirming these product choices:

- [ ] The production landing page will remain at `https://nouri-demo.netlify.app` for this release.
- [ ] Required visible fields will be full name, WhatsApp, state, area, and delivery address.
- [ ] City and landmark will be optional visible fields.
- [ ] Alternative phone, email, and customer note will be omitted from the first integration.
- [ ] Successful orders will stay on the same page and display the BPMS order number and
      `nextStepMessage`.
- [ ] WhatsApp CTAs remain available but do not create BPMS orders.
- [ ] No analytics provider will be introduced as part of this integration. A future conversion
      event may fire only after a confirmed HTTP `200` or `201` response.

If an unchecked item changes, update this specification before implementation.

## 5. Offer mapping

The IDs below are stable identifiers created by the applied BPMS migrations. Display copy must use
stable local keys rather than names as identifiers.

| Landing key   | BPMS code     | Display name | Current display price | BPMS offer ID                          |
| ------------- | ------------- | ------------ | --------------------: | -------------------------------------- |
| `one_pack`    | `ONE_PACK`    | 1 Pack       |               ₦15,000 | `20000000-0000-4000-8000-000000000001` |
| `two_packs`   | `TWO_PACKS`   | 2 Packs      |               ₦25,500 | `20000000-0000-4000-8000-000000000002` |
| `three_packs` | `THREE_PACKS` | 3 Packs      |               ₦36,000 | `20000000-0000-4000-8000-000000000003` |

Recommended landing-page configuration:

```text
VITE_BPMS_PUBLIC_ORDER_URL=https://yssvglxoyghrnropmjyh.supabase.co/functions/v1/create-public-order
VITE_BPMS_OFFER_ID_1_PACK=20000000-0000-4000-8000-000000000001
VITE_BPMS_OFFER_ID_2_PACKS=20000000-0000-4000-8000-000000000002
VITE_BPMS_OFFER_ID_3_PACKS=20000000-0000-4000-8000-000000000003
```

These are public identifiers, not secrets. Do not add any Supabase secret/service-role key to a
`VITE_*` variable.

### Price consistency rule

The displayed prices currently match the seeded BPMS prices, but BPMS administrators can change
offer prices. A landing-page release check must compare its displayed prices with BPMS Settings
before every deployment and after every production price change. The backend price remains
authoritative even if display copy becomes stale.

Dynamic catalog rendering is outside this first integration. It should be considered later if
prices will change frequently.

## 6. Public API contract

### Request

```http
POST /functions/v1/create-public-order
Content-Type: application/json
x-idempotency-key: landing-order-<UUID>
```

The key must be 16–200 characters. No staff authorization or secret browser credential is sent.

```json
{
  "customer": {
    "name": "Customer Name",
    "whatsapp": "+2348012345678"
  },
  "offerId": "20000000-0000-4000-8000-000000000002",
  "paymentMethod": "COD",
  "delivery": {
    "state": "Lagos",
    "city": "Ikeja",
    "area": "Alausa",
    "addressLine": "12 Example Street",
    "landmark": "Near Example Junction"
  },
  "attribution": {
    "source": "LANDING_PAGE",
    "sourceDetail": "nouri-demo.netlify.app",
    "utmSource": "facebook",
    "medium": "paid_social",
    "campaign": "example-campaign",
    "content": "creative-a",
    "term": null,
    "landingPage": "https://nouri-demo.netlify.app/?utm_source=facebook",
    "referrer": "https://www.facebook.com/",
    "gclid": null,
    "fbclid": "example-click-id",
    "ttclid": null
  }
}
```

Optional values should be omitted or sent as `null`; empty strings should be normalized to omitted
values before submission.

### Successful response

The backend returns HTTP `201` for a newly created order and HTTP `200` for an idempotent replay.
Both are success states.

```json
{
  "data": {
    "orderNumber": "NOURI-...",
    "nextStepMessage": "Your order is confirmed for review. Our team will contact you before delivery."
  }
}
```

### Error response

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Check the order details and try again.",
    "fieldErrors": null
  }
}
```

The UI must not depend on unrecognized provider or database messages. It should use the stable
public error code/message and a generic fallback.

## 7. Field mapping and validation

| BPMS field                  | Landing source           | Required | Client rule                                               |
| --------------------------- | ------------------------ | -------: | --------------------------------------------------------- |
| `customer.name`             | Full name                |      Yes | Trim; 2–160 characters                                    |
| `customer.whatsapp`         | WhatsApp                 |      Yes | Normalize to canonical Nigerian `+234...` format          |
| `customer.alternativePhone` | Not collected            |       No | Omit                                                      |
| `customer.email`            | Not collected            |       No | Omit                                                      |
| `offerId`                   | Selected stable plan key |      Yes | Resolve through the fixed mapping; never use display text |
| `paymentMethod`             | Constant                 |      Yes | Always `COD`                                              |
| `delivery.state`            | State                    |      Yes | Trim; 2–100 characters                                    |
| `delivery.city`             | City                     |       No | Trim; maximum 100; omit when blank                        |
| `delivery.area`             | Area                     |      Yes | Trim; 2–120 characters                                    |
| `delivery.addressLine`      | Delivery address         |      Yes | Trim; 5–300 characters                                    |
| `delivery.landmark`         | Landmark                 |       No | Trim; maximum 200; omit when blank                        |
| `attribution.source`        | Constant                 |      Yes | Always `LANDING_PAGE`                                     |
| `attribution.sourceDetail`  | Production hostname      |       No | `nouri-demo.netlify.app`; maximum 160                     |
| `attribution.utmSource`     | `utm_source`             |       No | Preserve first-touch session value; maximum 160           |
| `attribution.medium`        | `utm_medium`             |       No | Preserve first-touch session value; maximum 160           |
| `attribution.campaign`      | `utm_campaign`           |       No | Preserve first-touch session value; maximum 200           |
| `attribution.content`       | `utm_content`            |       No | Preserve first-touch session value; maximum 200           |
| `attribution.term`          | `utm_term`               |       No | Capture; maximum 200                                      |
| `attribution.landingPage`   | Initial page URL         |       No | Absolute URL including query string; maximum 500          |
| `attribution.referrer`      | `document.referrer`      |       No | Capture first referrer; maximum 500                       |
| `attribution.gclid`         | `gclid`                  |       No | Capture; maximum 500                                      |
| `attribution.fbclid`        | `fbclid`                 |       No | Capture; maximum 500                                      |
| `attribution.ttclid`        | `ttclid`                 |       No | Capture; maximum 500                                      |
| `customerNote`              | Not collected            |       No | Omit                                                      |

Backend validation remains authoritative. Client validation exists to improve the customer
experience and must mirror these limits.

## 8. Landing-page code design

### 8.1 Stable offer configuration

Update `src/data/content.ts`, or add `src/config/offers.ts`, so each plan has a stable key and its
configured BPMS ID. Validate all three environment values as UUIDs at application startup. A
missing or invalid mapping must disable submission and show a non-sensitive configuration message.

Display names and prices must never be used as integration identifiers.

### 8.2 `src/lib/bpms.ts`

Add a transport-only module that:

- accepts a typed payload and idempotency key;
- uses browser `fetch` with `POST`;
- sends only `Content-Type` and `x-idempotency-key`;
- uses `AbortController` with a 15-second timeout;
- parses success and error bodies defensively;
- treats `200` and `201` as success;
- exposes status, stable error code, safe message, field errors, and `Retry-After` where available;
- never logs the request payload; and
- distinguishes timeout/network uncertainty from definitive validation errors.

### 8.3 `src/lib/orderPayload.ts`

Add a pure mapper that:

- trims form values;
- normalizes the WhatsApp number through the existing phone helper;
- resolves the offer ID from the selected stable key;
- applies the constant COD payment method;
- removes blank optional fields;
- maps captured attribution to the API's camel-case shape; and
- returns a deterministic JSON-compatible object suitable for idempotency comparison.

### 8.4 `src/lib/idempotency.ts`

Store one pending logical order in `sessionStorage` under a versioned key such as
`nouri_pending_order_v1`:

```ts
interface PendingOrder {
  key: string
  payload: PublicOrderPayload
  createdAt: string
}
```

Generate keys as `landing-order-${crypto.randomUUID()}`. Reuse the key only when the normalized
payload is byte-for-byte equivalent. Create a new key whenever any order-defining field changes.

Clear the pending record only after a confirmed `200/201` response or when the customer explicitly
starts another order.

### 8.5 `src/lib/attribution.ts`

Retain the existing first-touch-per-session policy and extend the stored value to include:

- `utm_term`;
- `gclid`;
- `fbclid`;
- `ttclid`;
- the initial absolute landing URL; and
- the initial referrer.

Parse stored JSON defensively and apply the API length limits. Attribution edits must not expose or
store form/customer data.

### 8.6 `OrderForm.tsx`

Replace the 450ms simulation with the real async lifecycle:

```text
editing -> validating -> submitting -> success
                              |
                              +-> recoverable error -> retrying
                              +-> definitive error -> editing
```

The component must:

- add state, optional city, area, delivery address, and optional landmark fields;
- preserve existing name and WhatsApp fields;
- remove the customer-data `console.log`;
- prevent a second in-flight request with both state and a synchronous ref guard;
- reuse the pending key for safe retries;
- announce loading, errors, and success through an `aria-live` region;
- focus the first invalid field after client validation;
- keep customer input after recoverable errors;
- display `orderNumber` and `nextStepMessage` after success; and
- provide an explicit “Place another order” action that resets form data and idempotency state.

Do not mark the order successful based on a timer, button click, or client state alone.

### 8.7 `LandingPage.tsx`, `Pricing.tsx`, and WhatsApp

Use stable plan keys in lifted state. Pricing buttons should remain visually unchanged but expose a
named, accessible selection relationship. Pass the selected plan into WhatsApp URL construction so
the prefilled message no longer always defaults to 2 Packs.

WhatsApp submission remains independent of BPMS public-order submission.

## 9. Retry and idempotency policy

| Outcome                 | UI action                                                 | Idempotency action                                     |
| ----------------------- | --------------------------------------------------------- | ------------------------------------------------------ |
| `200` or `201`          | Show confirmed success                                    | Clear pending order after retaining result for display |
| Network failure/timeout | Show “delivery status unknown; retry safely”              | Reuse same key and unchanged payload                   |
| `429`                   | Disable immediate retry; honor `Retry-After` when present | Reuse same key and unchanged payload                   |
| `500` or `503`          | Offer retry without clearing fields                       | Reuse same key and unchanged payload                   |
| `400`                   | Show generic request error; require review                | Generate a new key only after payload correction       |
| `403`                   | Show service unavailable/configuration message            | Do not automatically retry                             |
| `409`                   | Explain the request changed; rebuild pending request      | Generate a new key after explicit user action          |
| `422`                   | Show safe validation/offer message and return to editing  | Generate a new key after any correction                |

The application must never generate a fresh key automatically after an uncertain network outcome.
Doing so could create a duplicate order.

## 10. CORS and backend configuration

The production `ALLOWED_ORIGINS` Edge Function secret currently protects both public orders and
staff functions. It must contain both exact production origins:

```text
https://nouri-bpms.netlify.app,https://nouri-demo.netlify.app
```

Do not use `*`, path suffixes, trailing route names, or speculative preview domains.

`APP_ORIGIN` must remain:

```text
https://nouri-bpms.netlify.app
```

It controls staff invite/reset destinations and must not be changed to the landing-page origin.

If a staging or deploy-preview site needs to create orders, add its exact HTTPS origin only for the
testing window, then remove it. Netlify wildcard preview origins are not permitted by the current
allowlist implementation.

## 11. Public error presentation

Recommended customer-facing handling:

| Code/status                        | Message/behavior                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| `VALIDATION_FAILED` / `422`        | Ask the customer to review highlighted details                               |
| `INVALID_PHONE` / `422`            | Focus WhatsApp and show the Nigerian-number guidance                         |
| `OFFER_UNAVAILABLE` / `422`        | State that the selected package is unavailable and require another selection |
| `IDEMPOTENCY_KEY_REQUIRED` / `400` | Generic retry message; log only the error code in diagnostics                |
| `IDEMPOTENCY_CONFLICT` / `409`     | Ask the customer to review and resubmit the changed order                    |
| `RATE_LIMITED` / `429`             | Ask the customer to wait before retrying                                     |
| `ORIGIN_FORBIDDEN` / `403`         | Generic service configuration message; no automatic retry                    |
| `SERVICE_NOT_CONFIGURED` / `503`   | Generic temporary-unavailability message                                     |
| `INTERNAL_ERROR` / `500`           | Generic temporary-unavailability message with safe retry                     |
| Network/timeout                    | Explain that the result is uncertain and offer a safe retry                  |

Never render raw HTML or an unrecognized backend/provider message. Preserve the entered form data.

## 12. Testing plan

The landing-page repository currently has no test framework. Add Vitest and Testing Library before
changing submission behavior, or add equivalent coverage using an already-approved test stack.

### Unit tests

- Nigerian phone normalization for local, `234`, `+234`, spaced, and invalid formats.
- Stable plan-key-to-UUID mapping for all three plans.
- Payload trimming and removal of blank optional fields.
- All field length limits.
- Attribution parsing, first-touch persistence, click IDs, referrer, and corrupt-storage recovery.
- Idempotency reuse for identical normalized payloads.
- New key creation after any order-defining edit.
- API response parsing and timeout classification.

### Component tests

- Required-field and accessible error behavior.
- Selected plan reaches the payload and WhatsApp message.
- Rapid double-click produces one request.
- `201` creation and `200` replay both display the order number.
- Recoverable failures keep field values and reuse the key.
- `422` and unavailable-offer behavior.
- `429` waiting behavior.
- Network-uncertain retry behavior.
- “Place another order” resets state and creates a new logical order.
- Customer data is not written to `console`.

### Controlled integration checks

- Production CORS preflight accepts `https://nouri-demo.netlify.app`.
- An unrelated origin receives `403`.
- One authorized test order creates exactly one BPMS record.
- Replaying the same payload/key returns `200` and the same order number.
- Reusing the key with changed payload returns `409`.
- The created order shows `LANDING_PAGE`, campaign attribution, correct offer, COD, customer, and
  delivery details in the operations application.

Do not load-test the production endpoint. The public limiter permits six attempts per hashed client
address per 60 seconds.

## 13. Deployment sequence

1. Confirm every approval gate in section 4.
2. Verify the three offers are active and their BPMS prices match the landing page.
3. Add `https://nouri-demo.netlify.app` to `ALLOWED_ORIGINS` while retaining the operations origin.
4. Confirm `APP_ORIGIN` remains the operations URL.
5. Implement stable plan keys, configuration validation, attribution expansion, payload mapping,
   idempotency, API transport, and the form lifecycle.
6. Remove the prototype timer, fake saved message, and customer-data console logging.
7. Add and pass unit/component tests.
8. Run the landing-page production build and inspect it for secrets and local URLs.
9. Configure the four public `VITE_*` BPMS values in Netlify.
10. Deploy a preview build. If preview integration is required, temporarily allow that exact origin.
11. Run non-mutating CORS/error checks from preview.
12. Deploy production.
13. Submit one explicitly marked test order and verify it in BPMS.
14. Replay the same request once to prove idempotency without creating a second order.
15. Cancel or otherwise identify the test order according to the operations process.
16. Remove any temporary preview origin and record release evidence.

## 14. Acceptance criteria

The integration is complete only when:

- all three visible plans map to their correct BPMS offer IDs;
- the displayed prices match active BPMS configuration at release time;
- the form collects every required customer and delivery field;
- valid Nigerian phone numbers are normalized before submission;
- every request sends COD and `LANDING_PAGE`;
- all supported campaign and click identifiers are preserved;
- the landing production origin is explicitly allowed by BPMS;
- double-clicks cannot create two requests;
- uncertain retries reuse the original key and payload;
- `200` and `201` display the returned order number and next-step message;
- errors preserve customer input and produce safe, actionable feedback;
- no customer payload appears in console or production logs;
- WhatsApp still works and includes the selected plan;
- tests and the production build pass; and
- one controlled production order is visible in BPMS with the correct offer, COD method,
  attribution, address, and order number.

## 15. Rollback

Frontend rollback is the previous known-good Netlify deployment. If production order submission is
faulty:

1. restore the preceding Netlify deployment;
2. remove the landing origin from `ALLOWED_ORIGINS` if the endpoint must be closed immediately;
3. retain the operations origin and `APP_ORIGIN`;
4. identify any test/partial orders through BPMS rather than deleting database records manually;
5. correct the integration in preview; and
6. repeat the acceptance checks before redeploying.

No database migration is required for this integration.

## 16. Deferred work

The following are useful but outside the first integration:

- live catalog/price rendering from BPMS;
- custom production domain migration;
- analytics provider and deduplicated conversion events;
- CAPTCHA or a privacy-preserving honeypot after observing abuse;
- privacy and terms pages;
- email, alternative phone, and customer-note fields;
- persisted attribution across browser sessions; and
- a dedicated staging Supabase project.
