# Nouri Operations V1

## Product Requirements Document + Technical Specification + IDE Agent Implementation Plan

**Document purpose:** This is the implementation source of truth for the first version of the Nouri internal Operations Management and Executive Admin web application. It converts the agreed product direction into buildable technical requirements and gives an IDE coding agent an ordered implementation sequence.

**Primary objective:** Build a reliable internal tool that receives orders from Nouri acquisition channels and manages each order from creation through customer confirmation, delivery, payment, and operational reporting.

**Primary users:**

- **Order Manager** - day-to-day order operations.
- **Executive Admin** - full operational oversight, staff control, financial visibility, and system administration.

**Important scope principle:** V1 is an operations system, not a full CRM, logistics platform, accounting package, or retention engine. Build the core commercial loop first and keep the architecture ready for later retention and messaging features.

**Locked V1 technology stack:** React + TypeScript + Vite on the frontend, with Supabase as the backend platform: Supabase Postgres, Supabase Auth, Row Level Security (RLS), database functions/RPC, and Supabase Edge Functions for privileged/public server-side workflows. Do not scaffold a separate Express/Prisma API unless the Product Manager explicitly changes this architecture.

---

# 1. Product Definition

Nouri Operations is a role-based internal web application sitting behind Nouri's acquisition channels.

Customer-facing acquisition channels may include:

- Conversion landing pages used for paid social campaigns.
- Nouri's standard website.
- WhatsApp-assisted sales.
- Phone/manual orders.
- Organic and affiliate campaigns.

All channels must feed a single canonical order system.

The V1 operational loop is:

```text
Acquisition channel
    -> Order request submitted
    -> Order created in Nouri Operations
    -> Order Manager reviews
    -> Customer contacted
    -> Order confirmed or cancelled/unreachable
    -> Delivery scheduled
    -> Order dispatched
    -> Delivery succeeds or fails
    -> Payment reconciled
    -> Order completed
    -> Customer/order history retained
```

The application must make it easy to answer:

- What new orders have arrived?
- Where did each order come from?
- Has the customer been contacted?
- Has the order been confirmed?
- What package did they select?
- What is the payment method and payment status?
- When is delivery scheduled?
- Has the order been dispatched?
- Was delivery successful?
- Was payment received?
- Which staff member performed each important action?
- Which orders need attention right now?
- How many submitted orders become delivered and paid orders?

---

# 2. V1 Goals and Success Criteria

V1 is complete when all of the following are true:

1. A customer can submit an order through the public `create-public-order` Supabase Edge Function used by the conversion landing page.
2. Supabase validates and stores the order, customer, selected offer, attribution data, delivery information, and payment method through RLS-protected data access and trusted functions.
3. The order appears in the internal web application without manual re-entry.
4. An Order Manager can contact the customer, confirm or reject the order, schedule delivery, dispatch it, record a delivery outcome, and record payment.
5. An Order Manager can also create a manual order for customers who order through WhatsApp or phone.
6. An Executive Admin can see all orders, business-level operational metrics, staff accounts, and audit activity.
7. Role permissions are enforced on the server, not only hidden in the UI.
8. All important workflow changes are recorded in an audit/event timeline.
9. The system can distinguish submitted orders from confirmed, delivered, and paid orders.
10. The application is secure enough for production use with protected authentication, validation, auditability, and basic operational monitoring.

---

# 3. Explicit V1 Scope

## 3.1 In scope

- Staff authentication.
- Login, forgot password, reset password, logout.
- Invite/set-password flow for staff accounts.
- Two primary RBAC roles: Order Manager and Executive Admin.
- Permission-based authorization.
- Public order intake Supabase Edge Function.
- Manual order creation.
- Customer records with normalized phone numbers.
- Order records and order items.
- Nouri package/offer selection.
- Support for free/bonus items included in an offer, such as a promotional balm, as zero-priced order items when applicable.
- Payment method support for Pay on Delivery and Prepaid.
- Prepaid discount support as configuration/offer logic rather than hard-coded UI pricing.
- Delivery scheduling and delivery outcomes.
- COD operational workflow.
- Acquisition/source attribution.
- Duplicate-order warning logic.
- Order search, filters, pagination, and operational queue.
- Customer list and customer detail/history.
- Executive operational dashboard.
- Staff management by Executive Admin.
- Audit trail / order event timeline.
- Basic system settings required by V1.
- Automated tests for critical business rules and permissions.

## 3.2 Deferred from V1

Do not expand the first release into the following unless the Product Manager explicitly re-scopes it:

- Customer accounts or customer login.
- Full CRM automation.
- Automated WhatsApp Business API campaigns.
- Loyalty points or rewards engine.
- Subscriptions.
- Reorder automation.
- Email marketing.
- Rider mobile app.
- Route optimization.
- Multi-warehouse management.
- Full inventory/stock-control suite.
- Full accounting or bookkeeping.
- AI recommendations.
- Advanced ad-platform integrations.
- Advanced campaign builder.
- Complex refunds workflow beyond recording status and reason.

These can be added after the V1 operational loop is stable.

---

# 4. User Roles and RBAC

## 4.1 Role: Order Manager

Purpose: execute daily order operations.

Typical capabilities:

- View order queue.
- Search/filter orders.
- Open order details.
- Create manual orders.
- Update allowed customer/order information.
- Contact customer using call or WhatsApp deep link.
- Mark customer contacted.
- Mark customer unreachable.
- Confirm orders.
- Cancel orders with reason.
- Schedule delivery.
- Mark an order dispatched where allowed.
- Record successful/failed delivery.
- Record COD payment received where allowed.
- View customer profile and order history.
- View operational dashboard metrics.

## 4.2 Role: Executive Admin

Purpose: full operational control and business oversight.

Capabilities include all Order Manager capabilities plus:

- View executive metrics and financial totals.
- View acquisition/channel performance.
- Override allowed workflow exceptions with reason.
- Manage staff accounts.
- Activate/deactivate users.
- Assign roles.
- Manage basic settings and offer configuration.
- View broader audit history.

## 4.3 Permission model

Do not scatter `if (role === 'admin')` checks throughout the codebase. Model roles and permissions explicitly.

Suggested permissions:

```text
dashboard.operations.read
dashboard.executive.read

order.read
order.create
order.update
order.contact
order.confirm
order.cancel
order.schedule
order.dispatch
order.deliver
order.fail_delivery
order.override

customer.read
customer.update

payment.read
payment.update
finance.read

analytics.read

staff.read
staff.manage

settings.read
settings.manage

audit.read
```

### Permission matrix

| Capability                           | Order Manager | Executive Admin |
| ------------------------------------ | ------------: | --------------: |
| View orders                          |           Yes |             Yes |
| Create manual order                  |           Yes |             Yes |
| Update allowed order/customer fields |           Yes |             Yes |
| Contact/confirm/cancel               |           Yes |             Yes |
| Schedule delivery                    |           Yes |             Yes |
| Dispatch / delivery update           |           Yes |             Yes |
| View customers                       |           Yes |             Yes |
| Operational dashboard                |           Yes |             Yes |
| Executive financial dashboard        |            No |             Yes |
| Acquisition analytics                |    Limited/No |             Yes |
| Workflow override                    |            No |             Yes |
| Manage staff                         |            No |             Yes |
| Manage settings/offers               |            No |             Yes |
| View full audit                      |       Limited |             Yes |

Authorization must be enforced server-side through Supabase RLS, database functions/RPC authorization, and privileged Edge Function checks.

---

# 5. Authentication Requirements

Supabase Auth is the authentication system for V1. Do not build a parallel password/session/token system in application tables.

## 5.1 Screens

- Login.
- Forgot password.
- Reset password.
- Accept staff invitation / set initial password.
- Session-expired state.

## 5.2 Registration rule

There is no public staff registration in V1.

Staff creation flow:

```text
Executive Admin
    -> Staff
    -> Invite User
    -> Privileged server-side function calls Supabase Admin Auth API
    -> User receives Supabase invite/recovery link
    -> User sets password
    -> Profile + role assignment becomes active
```

The first Executive Admin must be bootstrapped securely through a one-time seed/admin script using the Supabase service-role key outside the browser, or created manually in a controlled deployment setup.

## 5.3 Supabase Auth design

Requirements:

- Use Supabase Auth email/password for staff authentication.
- Use the Supabase JS client in the React application for sign-in, sign-out, session refresh, password recovery, and invite completion.
- Supabase-managed access/refresh tokens are the source of authentication state; do not create custom session tables.
- Never expose the `service_role` key to the browser.
- Store staff application metadata in an application-owned `profiles` table keyed by `auth.users.id`.
- Store role/permission assignments in application tables; do not rely only on editable client-side metadata.
- Enforce authorization with RLS and privileged database/Edge Function checks.
- Deactivated staff must be denied by RLS/business functions and, where appropriate, disabled through the Supabase Admin API.
- Password reset and invitation links use Supabase Auth recovery/invite flows and configured redirect URLs.
- Protect public Edge Functions with rate limiting/anti-abuse controls appropriate to the deployment platform.
- UI route guards are convenience only; security must remain effective when requests are made directly.

If the repository already has a Supabase project, reuse its project structure, migrations, and auth conventions rather than initializing a competing backend.

---

# 6. Canonical Domain Model

The system must use one canonical `Order` model regardless of source.

Do not create separate entities such as `InstagramOrder`, `WhatsAppOrder`, or `WebsiteOrder`.

Use one order with source/attribution metadata.

## 6.1 Core entities

Supabase-managed authentication entity:

- `auth.users` - owned and managed by Supabase Auth; never recreate this table in the public schema.

Application schema entities:

- Profile
- Role
- Permission
- RolePermission
- ProfileRole (or equivalent role assignment)
- Customer
- Product
- Offer
- OfferItem
- Order
- OrderItem
- Payment
- Delivery
- OrderEvent / AuditEvent
- IdempotencyKey / PublicRequest record where needed
- Optional Campaign/AcquisitionSource reference

Do **not** create custom `Session`, `PasswordResetToken`, or `StaffInvite` tables for authentication. Supabase Auth owns session, password-recovery, and invite mechanics. Application audit records may store the business event that a user was invited/deactivated without duplicating the token itself.

## 6.2 Customer

Suggested fields:

```text
id
first_name
last_name nullable
primary_phone_normalized
whatsapp_phone_normalized nullable
alternative_phone_normalized nullable
email nullable
state nullable
city nullable
area nullable
default_address nullable
created_at
updated_at
```

Phone normalization is mandatory.

Examples that must resolve to the same canonical Nigerian number where valid:

```text
08031234567
2348031234567
+2348031234567
```

Canonical storage example:

```text
+2348031234567
```

Create a reusable phone normalization/validation utility. Do not duplicate this logic across controllers.

## 6.3 Product

Suggested fields:

```text
id
name
slug
sku
active
created_at
updated_at
```

Initial product:

```text
Nouri Daily Fibre
```

A promotional balm, if offered, should be represented as a product/bonus item rather than only free text so fulfilment can see it.

## 6.4 Offer

An offer represents the package presented to the customer.

Suggested fields:

```text
id
name
code
active
base_price
prepaid_price nullable
currency
sort_order
metadata nullable
created_at
updated_at
```

Initial seed offers:

| Offer   | Quantity | Customer price | Saving vs single-pack price |
| ------- | -------: | -------------: | --------------------------: |
| 1 Pack  |        1 |     NGN 15,000 |                       NGN 0 |
| 2 Packs |        2 |     NGN 25,500 |                   NGN 4,500 |
| 3 Packs |        3 |     NGN 36,000 |                   NGN 9,000 |

These values are seed data, not permanent constants in frontend code.

An offer may also define:

- Included zero-priced bonus items.
- Free delivery flag.
- Consultation inclusion metadata if operations needs to display it.
- Prepaid discount/price.

When an order is created, copy the effective prices/items into immutable order-item snapshots so future offer changes do not rewrite historical orders.

## 6.5 Order

Suggested fields:

```text
id
order_number
customer_id
order_status
currency
subtotal_amount
discount_amount
delivery_fee_amount
total_amount
payment_method
source
source_detail nullable
campaign_name nullable
utm_source nullable
utm_medium nullable
utm_campaign nullable
utm_content nullable
utm_term nullable
landing_page nullable
referrer nullable
click_id_type nullable
click_id_value nullable
attribution_metadata json nullable
possible_duplicate boolean default false
assigned_to_user_id nullable
customer_note nullable
internal_note nullable
created_at
updated_at
completed_at nullable
cancelled_at nullable
```

Order number should be human-readable, for example:

```text
NOU-20261012-00421
```

Exact format may be adjusted, but it must be unique and searchable.

## 6.6 OrderItem

```text
id
order_id
product_id nullable
item_name_snapshot
sku_snapshot nullable
item_type  // PRODUCT or BONUS
quantity
unit_price
total_price
created_at
```

The snapshot fields protect historical order accuracy if catalog data changes.

## 6.7 Payment

```text
id
order_id
method
status
amount
provider nullable
provider_reference nullable
provider_payload json nullable
paid_at nullable
failed_at nullable
refunded_at nullable
created_at
updated_at
```

Payment methods:

```text
COD
PREPAID
```

Payment statuses:

```text
UNPAID
PENDING
PAID
FAILED
REFUNDED
```

Do not force payment status into the order lifecycle enum.

## 6.8 Delivery

Suggested fields:

```text
id
order_id
status
recipient_name
recipient_phone
state
city nullable
area
address_line
landmark nullable
scheduled_date nullable
delivery_window nullable
courier_name nullable
courier_phone nullable
tracking_reference nullable
failure_reason_code nullable
failure_reason_note nullable
dispatched_at nullable
delivered_at nullable
created_at
updated_at
```

The delivery address must be an order/delivery snapshot. Do not rely only on a customer's current default address because historical orders must retain the address used at the time.

Delivery statuses:

```text
NOT_SCHEDULED
SCHEDULED
DISPATCHED
DELIVERED
FAILED
RETURNED
```

## 6.9 OrderEvent / AuditEvent

Important operational actions must create an immutable event.

Suggested fields:

```text
id
order_id nullable
entity_type
entity_id
actor_user_id nullable
action
from_state nullable
to_state nullable
metadata json nullable
created_at
```

Examples:

```text
ORDER_CREATED
ORDER_VIEWED (optional; avoid noisy logging unless needed)
CUSTOMER_CONTACTED
CUSTOMER_UNREACHABLE
ORDER_CONFIRMED
ORDER_CANCELLED
DELIVERY_SCHEDULED
ORDER_DISPATCHED
DELIVERY_FAILED
ORDER_DELIVERED
PAYMENT_MARKED_PAID
PAYMENT_FAILED
STAFF_CREATED
STAFF_DEACTIVATED
SETTINGS_CHANGED
```

---

# 7. State Machines and Business Rules

Use separate state concepts instead of one giant status enum.

## 7.1 Order status

```text
NEW
CONTACTED
UNREACHABLE
CONFIRMED
CANCELLED
COMPLETED
```

Recommended transitions:

```text
NEW -> CONTACTED
NEW -> UNREACHABLE
NEW -> CONFIRMED
NEW -> CANCELLED

CONTACTED -> CONFIRMED
CONTACTED -> UNREACHABLE
CONTACTED -> CANCELLED

UNREACHABLE -> CONTACTED
UNREACHABLE -> CONFIRMED
UNREACHABLE -> CANCELLED

CONFIRMED -> CANCELLED          // only before final delivery, with reason
CONFIRMED -> COMPLETED          // system/business command when completion rules pass
```

Executive Admin may perform approved overrides, but every override requires a reason and audit event.

## 7.2 Delivery rules

```text
NOT_SCHEDULED -> SCHEDULED
SCHEDULED -> DISPATCHED
DISPATCHED -> DELIVERED
DISPATCHED -> FAILED
FAILED -> SCHEDULED             // reattempt if appropriate
DELIVERED -> RETURNED           // if return process is supported
```

Business requirements:

- Dispatch requires a confirmed order and valid delivery details.
- Delivery scheduling requires a confirmed order.
- Marking delivered normally requires previous delivery status `DISPATCHED`.
- Executive Admin override may bypass a transition only with a reason.

## 7.3 Payment rules

### COD

Typical flow:

```text
Order created -> payment UNPAID
Order delivered -> record COD payment -> payment PAID
```

An order should not be considered `COMPLETED` for a normal successful COD flow unless:

```text
delivery.status == DELIVERED
AND payment.status == PAID
```

### Prepaid

Typical flow:

```text
Order created -> payment PENDING
Provider payment succeeds -> payment PAID
Order can proceed through confirmation/fulfilment
```

Provider integration must verify payment server-side. Never trust a frontend success flag.

## 7.4 Cancellation

Cancellation must capture:

- Cancellation reason code.
- Optional free-text note.
- Actor.
- Timestamp.

Example reasons:

```text
CUSTOMER_REQUEST
DUPLICATE_ORDER
OUT_OF_COVERAGE
UNREACHABLE
INVALID_ORDER
OTHER
```

## 7.5 Failed delivery

Failure must capture a reason, for example:

```text
CUSTOMER_UNAVAILABLE
WRONG_ADDRESS
NO_ANSWER
CUSTOMER_CANCELLED
PAYMENT_UNAVAILABLE
COURIER_ISSUE
OTHER
```

---

# 8. Acquisition and Order Intake

## 8.1 Public order intake Edge Function

Expose a controlled Supabase Edge Function for customer-facing pages. The browser must not receive elevated database credentials.

Suggested function name:

```text
create-public-order
```

Do not expose the internal admin order mutation surface publicly.

Example request:

```json
{
  "customer": {
    "name": "John Doe",
    "whatsapp": "08031234567",
    "alternativePhone": null
  },
  "offerId": "offer_2_pack",
  "paymentMethod": "COD",
  "delivery": {
    "state": "Lagos",
    "area": "Yaba",
    "addressLine": "12 Example Street",
    "landmark": "Near Example Junction"
  },
  "attribution": {
    "source": "tiktok",
    "medium": "paid_social",
    "campaign": "constipation_october",
    "content": "creative_03",
    "landingPage": "/nouri-tiktok",
    "ttclid": "..."
  }
}
```

The client sends `offerId`; it does not provide the authoritative price.

Server-side order creation flow (Edge Function -> transactional Postgres function/RPC):

```text
Validate request
-> Normalize phones
-> Resolve offer
-> Calculate price server-side
-> Find or create customer
-> Check duplicate warning conditions
-> Snapshot order items and bonuses
-> Create delivery snapshot
-> Create payment record
-> Create order event
-> Commit in one database transaction
-> Return order number and next-step data
```

## 8.2 Manual order creation

Internal creation contract:

```text
RPC: create_manual_order(...)
```

The React app calls this authenticated RPC with the logged-in staff JWT. RLS/function authorization must verify the caller has `order.create`.

Order Manager uses this for WhatsApp/phone-assisted orders.

Required UI fields:

- Customer name.
- WhatsApp/phone.
- Optional alternate phone.
- Offer/package.
- Delivery details.
- Source.
- Payment method.
- Optional notes.

Source examples:

```text
LANDING_PAGE
WEBSITE
WHATSAPP
PHONE
INSTAGRAM
FACEBOOK
TIKTOK
AFFILIATE
OTHER
```

## 8.3 Duplicate-order detection

On creation:

- Normalize the phone number.
- Find recent active orders for the same customer/phone.
- Compare recent order items/offer and active status.
- If suspicious, set `possible_duplicate = true` and return a warning to the internal UI.
- Do not automatically reject the order because the customer may intentionally be making another purchase.

Exact warning window should be configurable. A safe V1 default is 24 hours for same phone + same/similar active package.

## 8.4 Two-step lead capture

The conversion page concept may capture name + WhatsApp first and request the full order afterward.

This is valuable for conversion analytics and abandoned checkout recovery, but it is not required to block the core V1 operations release.

Treat `Lead` / incomplete checkout capture as **V1.1 optional** unless explicitly pulled into the initial sprint. If implemented, keep it separate from confirmed order records so incomplete leads do not pollute operational order counts.

---

# 9. Order Management Requirements

## 9.1 Orders list

Primary daily workspace for Order Managers.

Required columns/card content:

- Order number.
- Customer name.
- Phone/WhatsApp.
- Package/quantity.
- Order total.
- Source.
- Payment method.
- Payment status.
- Order status.
- Delivery status.
- Created time.
- Assigned staff if used.

Required tabs/quick filters:

```text
All
New
Contacted
Unreachable
Confirmed
Scheduled
Dispatched
Delivered
Failed Delivery
Cancelled
Completed
```

These quick views may be derived from combined order + delivery + payment states.

Required filters:

- Date range.
- Order status.
- Delivery status.
- Payment method.
- Payment status.
- Acquisition source.
- Assigned staff.
- Scheduled delivery date.

Required search:

- Order number.
- Customer name.
- Phone number.

Use server-side pagination.

## 9.2 Order detail page

This is the core operational screen.

Required sections:

### Header

- Order number.
- Created time.
- Current order/delivery/payment status badges.
- Primary allowed next action.

### Customer

- Name.
- Phone.
- WhatsApp.
- Alternative phone if available.
- Quick Call button.
- Quick WhatsApp button.

### Order

- Selected package.
- Item quantities.
- Bonus/free items.
- Unit prices/order snapshots.
- Discount.
- Delivery fee.
- Total.

### Payment

- Method.
- Status.
- Amount.
- Provider/reference for prepaid when applicable.

### Delivery

- Address snapshot.
- State/area.
- Landmark.
- Scheduled date/window.
- Courier fields when dispatched.
- Failure reason if any.

### Acquisition

- Source.
- Campaign.
- UTM metadata.
- Landing page.
- Click ID if captured.

### Notes

- Customer-facing/order note.
- Internal operational note.

### Timeline

- Immutable operational events in chronological order.

## 9.3 Context-aware actions

Only show actions valid for the current state.

Examples:

- `NEW`: Contact, Mark Unreachable, Confirm, Cancel.
- `CONTACTED`: Confirm, Mark Unreachable, Cancel.
- `CONFIRMED` + delivery not scheduled: Schedule Delivery, Cancel.
- `SCHEDULED`: Dispatch, Reschedule, Cancel if policy permits.
- `DISPATCHED`: Mark Delivered, Mark Delivery Failed.
- `DELIVERED` + COD unpaid: Mark Payment Received.
- `DELIVERED` + payment paid: Complete Order.

Supabase RLS and the authoritative RPC/database function must independently enforce the same rules even if UI buttons are hidden.

## 9.4 Order confirmation

Confirm Order action must validate:

- Customer identity present.
- Valid contact phone.
- At least one order item.
- Valid effective price.
- Delivery address available unless the business explicitly supports pickup.
- Payment method selected.

Confirmation UI should let staff verify:

- Customer.
- Package/quantity.
- Total.
- Delivery address.
- Preferred/scheduled delivery date if collected.
- Payment method.
- Notes.

Create audit event on success.

---

# 10. Delivery Management

## 10.1 Schedule delivery

Required fields:

- Scheduled date.
- Optional delivery window.
- Confirm delivery address snapshot.
- Optional delivery note.

Authoritative command:

```text
RPC: schedule_delivery(order_id, ...)
```

## 10.2 Dispatch

Required fields where known:

- Courier name.
- Courier phone.
- Tracking/dispatch reference.
- Dispatch note.

Authoritative command:

```text
RPC: dispatch_order(order_id, ...)
```

## 10.3 Delivery success

Authoritative command:

```text
RPC: mark_order_delivered(order_id, ...)
```

For COD, the UI should immediately prompt for payment outcome if payment is still unpaid.

## 10.4 Delivery failure

Authoritative command:

```text
RPC: fail_delivery(order_id, reason, ...)
```

Request must include failure reason.

System should allow an appropriate re-schedule/reattempt path afterward.

---

# 11. Payments

## 11.1 COD

COD is a first-class payment method, not an exception.

Order details must clearly display:

- COD badge.
- Amount due.
- Payment status.

After successful delivery, authorized staff can mark the COD amount as received.

Authoritative command:

```text
RPC: mark_cod_paid(order_id, ...)
```

The authoritative database function records the authenticated actor (`auth.uid()`) and timestamp.

## 11.2 Prepaid

Keep payment integration behind a provider adapter/interface so the application is not tightly coupled to one gateway.

Suggested interface concept:

```ts
interface PaymentProvider {
  initializePayment(input): Promise<PaymentInitializationResult>
  verifyPayment(reference): Promise<VerifiedPaymentResult>
  validateWebhook(signature, payload): boolean
}
```

If no gateway has been selected at implementation time:

- Implement the domain/payment records and provider abstraction.
- Implement a local/mock provider for development/test.
- Leave the production adapter behind explicit configuration.
- Do not fake a real payment success path in production.

If a real provider is selected, add:

- Server-side initialization.
- Signed webhook verification.
- Idempotent webhook handling.
- Server-side payment verification.

## 11.3 Prepaid incentive

Prepaid pricing/discount must be derived server-side from active offer configuration.

Do not trust an arbitrary discount sent by the frontend.

---

# 12. Customer Management

## 12.1 Customer list

Required fields:

- Name.
- Primary phone.
- Location/area where available.
- Total orders.
- Delivered orders.
- Last order date.
- Last order status.
- Total paid spend where available.

Required search:

- Name.
- Phone.

## 12.2 Customer detail

Required sections:

- Contact information.
- Default location/address.
- Order history.
- Total orders.
- Delivered orders.
- Cancelled orders.
- Failed deliveries.
- Total paid spend.
- First acquisition source.
- Most recent acquisition source.

V1 customer history is operational. Retention automation is deferred.

---

# 13. Dashboards and Reporting

## 13.1 Order Manager dashboard

Purpose: show work requiring attention.

Suggested cards:

- New orders.
- Awaiting confirmation.
- Unreachable orders.
- Deliveries scheduled today.
- Dispatched today.
- Failed deliveries requiring action.

Suggested work queues:

- Newest unhandled orders.
- Orders overdue for confirmation.
- Today's scheduled deliveries.
- Failed deliveries pending reattempt/cancellation.

## 13.2 Executive Admin dashboard

Purpose: show business operational performance.

Suggested metrics:

- Orders submitted today / selected period.
- Confirmed orders.
- Delivered orders.
- Completed/paid orders.
- Gross submitted order value.
- Delivered revenue.
- Collected/paid revenue.
- COD delivery success rate.
- Cancellation rate.
- Failed delivery rate.
- Order conversion: submitted -> confirmed -> delivered -> paid.
- Source/channel distribution.
- Delivered revenue by source.

Important: do not display CAC unless ad-spend data is actually available. If V1 later supports manual campaign spend entry, calculate CAC only from that explicit data.

## 13.3 Attribution dimensions

Capture enough source metadata to report by:

- Channel/source.
- Campaign.
- Landing page.
- UTM campaign/content.
- Date.

The most important acquisition outcome is delivered and paid orders, not merely form submissions.

---

# 14. Staff Management

Executive Admin only.

Required functionality:

- List staff.
- Search staff.
- Create/invite staff.
- Assign role.
- Activate/deactivate account.
- Re-send invite if safe/appropriate.
- View last login/last active if implemented.

Deactivating a user must revoke active sessions.

Do not delete staff records that are referenced by audit events. Use inactive status instead.

---

# 15. Basic Settings

Keep V1 settings small.

Possible settings:

- Order duplicate-warning window.
- Default currency (`NGN`).
- Offer activation/pricing where Executive Admin editing is included.
- Prepaid incentive value/price.
- Delivery fee defaults/free-delivery offer behavior.
- Basic business contact information used by UI/notifications.

Do not build a generic configuration platform.

---

# 16. Supabase Backend Contract - Initial Surface

The V1 backend is Supabase. There is no separate Express API server. Use the right Supabase mechanism for each type of operation:

- **Supabase Auth** for staff sign-in, sign-out, recovery, invite acceptance, and session refresh.
- **RLS-protected tables/views** for safe read queries.
- **Postgres database functions exposed through RPC** for authenticated business commands that require atomic state transitions and audit records.
- **Supabase Edge Functions** for public order intake, payment initialization/webhooks, staff invitations using the Admin API, or workflows that require protected third-party secrets.

Important: the frontend must never use the service-role key. Elevated operations run only in Edge Functions, secure server scripts, or trusted deployment jobs.

## 16.1 Auth

Use Supabase JS/Auth APIs:

```text
signInWithPassword
signOut
getSession / onAuthStateChange
resetPasswordForEmail
updateUser              // set new password after recovery/invite
```

Executive Admin staff invitation must go through a privileged Edge Function, e.g.:

```text
invite-staff
```

That function validates the caller's role/permission before invoking the Supabase Admin Auth API.

## 16.2 Public acquisition

```text
Edge Function: create-public-order
```

Optional V1.1:

```text
Edge Function: create-public-lead
RPC/Edge Function: update-public-lead
```

The public order function validates the request, normalizes the phone, resolves active offer/pricing server-side, and invokes one transactional Postgres function to create the customer/order/items/payment/delivery/audit records.

## 16.3 Orders

Safe reads:

- RLS-protected `orders` query/view with pagination/filtering.
- RLS-protected order-detail view/query.

Authoritative RPC commands:

```text
create_manual_order(...)
mark_order_contacted(order_id, ...)
mark_order_unreachable(order_id, reason)
confirm_order(order_id, ...)
cancel_order(order_id, reason)
schedule_delivery(order_id, ...)
dispatch_order(order_id, ...)
mark_order_delivered(order_id, ...)
fail_delivery(order_id, reason, ...)
complete_order(order_id)
```

Use RPC commands rather than allowing the React client to arbitrarily write workflow status columns.

## 16.4 Payments

```text
RPC: mark_cod_paid(order_id, ...)
Edge Function: initialize-prepaid-payment
Edge Function: payment-webhook-<provider>
```

Provider webhooks must validate signatures and perform idempotent database updates using protected secrets.

## 16.5 Customers

Safe reads/updates are exposed through RLS policies and, where useful, views/RPC:

```text
customers                       // paginated/searchable RLS-protected query
customer_order_history(...)     // view or RPC
update_customer(...)            // RPC if update rules are non-trivial
```

## 16.6 Dashboards

Use security-aware views or RPC functions that return only the metrics the caller may access:

```text
get_operations_dashboard(date_range)
get_executive_dashboard(date_range)
```

Executive metrics must verify Executive Admin permission server-side.

## 16.7 Staff

Use an Edge Function for actions that require the Supabase Admin Auth API:

```text
invite-staff
update-staff-access
activate-staff
deactivate-staff
```

Staff listing/profile data may be read through RLS-protected profile views.

## 16.8 Offers/settings

Use RLS-protected reads. Executive mutations should use RPCs where validation/audit is needed:

```text
get_active_offers(...)
update_offer(...)
get_settings(...)
update_settings(...)
```

Offer pricing must remain authoritative in the database, not in the React bundle.

---

# 17. Validation and Error Contract

Validation occurs in layers:

- React form validation for user experience.
- Zod (or equivalent) validation inside Edge Functions for external/public payloads.
- Postgres constraints and authoritative database functions for business invariants.
- RLS for row access authorization.

Recommended application error shape returned by Edge Functions/RPC wrappers:

```json
{
  "error": {
    "code": "ORDER_INVALID_TRANSITION",
    "message": "This order cannot be dispatched before delivery is scheduled.",
    "fieldErrors": null,
    "requestId": "..."
  }
}
```

Requirements:

- Do not expose stack traces, database internals, or sensitive secrets to the client.
- Use stable machine-readable business error codes from database functions/Edge Functions.
- Validation errors provide field-level details where useful.
- Business-rule errors are distinguishable from transport/infrastructure errors.
- Auth failures and RLS authorization failures are handled consistently in the UI.
- The client must not infer authorization from UI state alone.

---

# 18. Transaction and Idempotency Requirements

## 18.1 Order creation transaction

Order creation must be atomic in Postgres. Prefer one authoritative database function invoked by the Edge Function/RPC so all related writes happen in a single database transaction:

- Find/create or attach customer.
- Create order.
- Create order items.
- Create delivery record/snapshot.
- Create payment record.
- Create initial order event.

If any required step fails, the transaction rolls back and no partial order remains.

## 18.2 Public duplicate submissions

Protect against accidental repeated form submissions.

Preferred implementation:

- Public client generates an idempotency key for each intended checkout submission.
- `create-public-order` forwards the key into the transactional database function.
- Store/lock the key in an idempotency table with request fingerprint/result for an appropriate TTL or permanent business-safe retention.
- A repeated identical key returns the original result rather than creating a second order.
- Keep business-level duplicate warning logic based on phone/recent active order separately.

Idempotency solves technical retries; duplicate warning solves customer behavior.

## 18.3 Payment webhooks

Supabase Edge Function webhook handling must be idempotent.

Requirements:

- Verify provider signature using Edge Function secrets.
- Persist provider event/reference uniqueness.
- Repeated events must not create repeated payment records or repeat state transitions.
- Database mutation should be performed atomically through protected SQL/RPC.

---

# 19. Frontend Information Architecture

## 19.1 Order Manager routes

```text
/login
/forgot-password
/reset-password
/invite/:token

/dashboard
/orders
/orders/new
/orders/:id
/customers
/customers/:id
```

## 19.2 Executive Admin additional routes

```text
/analytics               // or executive dashboard section
/staff
/staff/:id
/settings
/offers                   // if offer management ships in V1
```

## 19.3 Recommended primary navigation

Order Manager:

```text
Dashboard
Orders
Customers
+ Create Order
```

Executive Admin:

```text
Dashboard
Orders
Customers
Analytics
Staff
Settings
```

Orders are the center of the operational application. Do not over-prioritize a decorative dashboard over the order queue.

---

# 20. UI Screen Requirements

## Authentication

1. Login.
2. Forgot Password.
3. Reset Password.
4. Accept Invite / Set Password.

## Order Manager

5. Operations Dashboard.
6. Orders List.
7. Order Detail.
8. Create Manual Order.
9. Customers List.
10. Customer Detail.

## Executive Admin

11. Executive Dashboard / Analytics.
12. Staff Management.
13. Staff Create/Edit/Invite.
14. Basic Settings.
15. Offer Management if included in first release.

Use modals/drawers for focused state changes where appropriate:

- Confirm order.
- Cancel order.
- Mark unreachable.
- Schedule delivery.
- Dispatch.
- Mark delivered.
- Failed delivery.
- Mark payment received.

---

# 21. Locked Reference Stack

This stack is agreed for Nouri V1. The IDE agent should reuse an existing compatible setup if present; otherwise scaffold exactly this architecture. Do not introduce Express, Prisma, or a separate custom API server without explicit Product Manager approval.

## 21.1 Frontend

- React.
- TypeScript with strict mode.
- Vite.
- React Router.
- `@supabase/supabase-js`.
- TanStack Query for server/cache state where it improves UX.
- React Hook Form.
- Zod for client/Edge Function schemas where appropriate.
- Tailwind CSS.
- A small accessible component library such as shadcn/ui if useful.

Suggested structure:

```text
src/
  app/
  components/
  features/
    auth/
    dashboard/
    orders/
    customers/
    staff/
    settings/
  lib/
    supabase/
  hooks/
  types/
```

## 21.2 Supabase backend

Use one Supabase project per environment (local/dev, staging where available, production).

Backend capabilities:

- **Supabase Postgres** - source of truth for operational data.
- **Supabase Auth** - staff authentication, recovery, and sessions.
- **Row Level Security (RLS)** - mandatory authorization boundary for exposed tables/views.
- **Postgres functions/RPC** - transactional business commands and aggregate queries.
- **Supabase Edge Functions** - public order ingestion, payment integration/webhooks, staff invitations/admin-auth operations, and third-party-secret workflows.
- **Supabase Realtime** - optional for live order queue updates; do not make V1 correctness depend on Realtime.
- **Supabase Storage** - optional only if later V1 screens need files; otherwise defer.

Repository structure if starting fresh:

```text
src/                         # React application
supabase/
  config.toml
  migrations/
  functions/
    create-public-order/
    invite-staff/
    initialize-prepaid-payment/
    payment-webhook-<provider>/
  seed.sql
```

Keep database functions logically grouped/named by domain in migrations. Do not split the V1 backend into microservices.

## 21.3 Data access rules

- Browser uses only the Supabase URL + publishable/anon key.
- Browser sends the logged-in user's Supabase JWT automatically through the client SDK.
- RLS must be enabled on every exposed operational table.
- Client may perform direct reads/limited simple writes only where RLS and constraints make them safe.
- Workflow transitions use RPC/database functions, not arbitrary client updates.
- Service-role access is limited to Edge Functions, secure scripts, or trusted CI/deployment tasks.

## 21.4 Testing

- Vitest for TypeScript/unit tests.
- React Testing Library for important component behavior where useful.
- Supabase CLI local stack for database/Auth/Edge Function integration tests.
- SQL/pgTAP tests where valuable for RLS policies and database functions.
- Playwright for critical end-to-end flows.

## 21.5 Architecture style

Use a **Supabase-backed modular application**: one React app and one Supabase backend organized by business domains. Domain boundaries (auth/RBAC, orders, customers, payments, delivery, analytics, audit) should be explicit in SQL migrations, functions, Edge Functions, frontend features, and tests.

Do not create a second Node/Express backend merely to mirror Supabase functionality.

---

# 22. Non-Functional Requirements

## 22.1 Security

- HTTPS in production.
- Supabase Auth manages password hashing, session tokens, refresh tokens, reset links, and invite links.
- RLS enabled and tested on every exposed operational table/view.
- Authorization checks inside privileged RPC/database functions in addition to RLS where needed.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to React or public client code.
- Edge Functions validate all public/third-party payloads.
- Restrict CORS/allowed origins for Edge Functions as appropriate.
- Rate-limit or otherwise protect public order, invite, and payment endpoints against abuse.
- Use Supabase Edge Function secrets / deployment secrets for payment-provider and admin credentials.
- Use parameterized SQL/function arguments; never concatenate untrusted SQL.
- Audit privileged mutations.
- No sensitive payment card details stored directly in Nouri tables.

## 22.2 Reliability

- Transactional Postgres functions for multi-record business operations.
- Idempotency for public order creation and payment webhooks.
- Controlled state machines in authoritative database functions.
- Migration discipline through Supabase migrations.
- Functions should fail atomically with stable business error codes.
- Realtime is optional UX enhancement, not the source of truth.

## 22.3 Performance

- Server-side pagination/filtering; do not fetch thousands of orders into the browser.
- Index common search/filter columns.
- Use database views/RPC for aggregate dashboards instead of computing large datasets client-side.

Recommended indexes include:

```text
customers.primary_phone_normalized unique/index
orders.order_number unique
orders.customer_id
orders.order_status
orders.created_at
orders.source
deliveries.status
deliveries.scheduled_date
payments.status
payments.order_id
order_events.order_id
```

## 22.4 Observability

- Supabase logs for Edge Functions/database/Auth operations.
- Error tracking integration in the React app and Edge Functions (provider optional).
- Include correlation/request IDs in public Edge Function workflows when practical.
- Audit events for important business changes.
- Production runbook should document where to inspect Supabase logs and failed function invocations.

A separate custom `/health` API is not required. Release checks should verify the frontend is reachable and the app can perform a simple authenticated Supabase query/RPC against the target environment.

## 22.5 Accessibility / UX

- Keyboard-accessible internal application.
- Clear focus states.
- Semantic forms and labels.
- Status should never be represented by color alone.
- Responsive admin layout, optimized primarily for desktop/tablet operations but usable on mobile.

---

# 23. Environment Configuration

Example environment variables. Exact names may adapt to deployment conventions.

React/Vite client (safe to expose):

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=          # or VITE_SUPABASE_PUBLISHABLE_KEY where applicable
VITE_APP_ORIGIN=
```

Supabase Edge Function / trusted server secrets (never expose to browser):

```text
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PUBLIC_ORDER_RATE_LIMIT=
ALLOWED_ORIGINS=

PAYMENT_PROVIDER=mock
PAYMENT_WEBHOOK_SECRET=
PAYMENT_PUBLIC_KEY=
PAYMENT_SECRET_KEY=

EMAIL_PROVIDER=
EMAIL_FROM=
```

Local development should use the Supabase CLI-generated local keys/environment where possible.

Do not commit real secrets. Do not put service-role/payment-secret values into `VITE_*` variables because Vite bundles them into browser code.

---

# 24. Seed Data

Development/staging seed should create:

## Roles

- ORDER_MANAGER
- EXECUTIVE_ADMIN

## Permissions

All permissions defined in the permission matrix.

## Users

- One bootstrap Executive Admin Supabase Auth user created through a secure one-time admin/seed script, with a linked `profiles` row and Executive Admin role assignment.
- Optional demo Order Manager in non-production environments only.

## Products

- Nouri Daily Fibre.
- Promotional balm product if the current offer includes it.

## Offers

- 1 Pack - NGN 15,000.
- 2 Packs - NGN 25,500.
- 3 Packs - NGN 36,000.

Optional offer metadata:

- Free delivery.
- Bonus balm.
- Consultation included.
- Prepaid price/discount.

Never seed fake production customers/orders into production.

---

# 25. Testing Strategy

## 25.1 Unit/business-rule tests

Must cover:

- Phone normalization.
- Offer pricing calculation.
- Prepaid discount calculation.
- Order transition rules.
- Delivery transition rules.
- Completion rules.
- Duplicate warning logic.
- Permission checks.

## 25.2 Supabase integration tests

Must cover against the Supabase local stack where practical:

- Supabase Auth login success/failure and deactivated-user behavior.
- RLS denial for unauthenticated/unauthorized queries.
- Role/permission denial for Executive Admin-only data/functions.
- Public `create-public-order` Edge Function.
- Idempotent repeated public order request.
- Manual order RPC.
- Order confirmation RPC.
- Invalid state transition rejection at the database function layer.
- Delivery schedule -> dispatch -> delivered flow.
- COD payment RPC.
- Executive Admin staff invitation/deactivation Edge Functions.
- Service-role-only operations are inaccessible from anon/authenticated browser credentials.

## 25.3 End-to-end tests

Minimum critical E2E flows:

### Flow A - public COD order

```text
Submit public order
-> Login as Order Manager
-> Find order
-> Contact/confirm
-> Schedule delivery
-> Dispatch
-> Mark delivered
-> Mark COD paid
-> Complete order
```

### Flow B - manual WhatsApp order

```text
Login as Order Manager
-> Create manual order
-> Confirm
-> Complete delivery/payment flow
```

### Flow C - RBAC

```text
Order Manager attempts staff-management route
-> receives forbidden
Executive Admin accesses route
-> succeeds
```

---

# 26. Acceptance Criteria by Major Feature

## 26.1 Authentication

**User story:** As a staff member, I can securely sign in and access only what my role permits.

**Acceptance criteria:**

- Valid active user can sign in.
- Invalid credentials produce a generic error.
- Deactivated user cannot sign in.
- Supabase session is established and refreshed using the supported Supabase client flow.
- Logout clears the local Supabase session; deactivation/privileged security events prevent continued authorized access.
- Forgot/reset-password behavior follows Supabase Auth recovery semantics and configured redirect URLs.
- No public registration route exists.

## 26.2 Public order creation

**User story:** As a customer coming from a conversion page, I can submit an order that immediately enters Nouri Operations.

**Acceptance criteria:**

- Required fields are validated.
- Phone is normalized.
- Price is calculated from authoritative Supabase/Postgres offer data, never from client-supplied totals.
- Order/customer/payment/delivery/items/event are created transactionally.
- Attribution is stored.
- Response returns order number.
- Technical retries can be idempotent.
- Suspicious recent duplicate is flagged, not silently discarded.

## 26.3 Orders queue

**User story:** As an Order Manager, I can see and prioritize orders needing action.

**Acceptance criteria:**

- Orders are paginated.
- Search works by order number, name, and normalized phone.
- Status/source/date filters work.
- Newest orders can be sorted first.
- State badges are clear.
- Opening an order shows full operational context.

## 26.4 Confirm order

**User story:** As an Order Manager, I can verify customer/order information and confirm a legitimate order.

**Acceptance criteria:**

- Only allowed states can be confirmed.
- Required order/customer/delivery/payment data is present.
- Confirmation creates event with actor/time.
- UI updates without stale state.

## 26.5 Delivery workflow

**User story:** As operations staff, I can schedule, dispatch, and record the outcome of a confirmed order.

**Acceptance criteria:**

- Unconfirmed order cannot be normally scheduled/dispatched.
- Dispatch requires scheduled delivery.
- Delivered/failed outcomes require dispatch unless admin override is explicitly used.
- Failure reason is required for failed delivery.
- Reattempt can be scheduled from failed state where policy allows.

## 26.6 COD payment

**User story:** As authorized staff, I can record that payment was collected for a delivered COD order.

**Acceptance criteria:**

- COD amount due is visible.
- Payment marking is audited.
- Completed status requires delivered + paid in normal COD flow.
- Unauthorized users cannot override payment state.

## 26.7 Staff management

**User story:** As Executive Admin, I can create and deactivate staff accounts safely.

**Acceptance criteria:**

- Only Executive Admin can manage staff.
- New staff uses invite/set-password flow.
- Deactivation immediately prevents further authorized access; disable/revoke Supabase Auth access using the approved Admin Auth flow where applicable.
- Historical audit records continue referencing the deactivated user.

---

# 27. IDE Agent Operating Instructions

This section is written specifically for the coding agent.

## 27.1 General rules

1. Treat this document as the product/technical source of truth unless the repository contains a newer explicit specification.
2. The locked stack is React + TypeScript + Vite + Supabase. Do not add Express, Prisma, a custom Node API server, Firebase, or another backend platform unless explicitly approved.
3. Inspect the repository before generating code. Reuse any existing compatible React/Supabase setup.
4. Work in small vertical slices that are runnable and testable.
5. Do not implement deferred Phase 2 features unless required to complete a V1 flow.
6. Do not hard-code package prices in multiple places. Use seeded offer records and authoritative Postgres calculations.
7. Do not trust frontend-supplied prices, payment success, roles, or workflow state.
8. Never put the Supabase service-role key or payment secret in React/browser code.
9. Enable and test RLS on every exposed operational table.
10. Do not allow arbitrary workflow status mutation. Use database RPC/business functions that validate transitions and write audit events atomically.
11. Every privileged Edge Function/RPC must derive the actor from authenticated context and verify authorization server-side.
12. Add/update tests as each business capability is implemented, including RLS/function tests.
13. Preserve Supabase migrations; never edit an already-applied production migration. Add a new migration.
14. Prefer simple, explicit SQL/functions and React feature modules over speculative abstractions.
15. Keep V1 in one Supabase project per environment; do not split into microservices.
16. If blocked by a genuinely missing business decision, document the blocker and implement the safest non-destructive default only where possible.
17. At the end of each implementation phase, provide: files changed, migrations added, Edge Functions/RPCs added, tests added, how to run, and remaining risks/TODOs.

---

# 28. Step-by-Step Implementation Plan

The coding agent should implement in this order. Complete one step, run its checks, and produce the checkpoint report before proceeding.

## Step 0 - Repository and Supabase audit

**Goal:** understand what already exists before changing anything.

Tasks:

- Inspect repository structure and package manager.
- Confirm React/TypeScript/Vite status.
- Locate any existing Supabase client setup, `supabase/` directory, migrations, Edge Functions, generated database types, and environment files.
- Identify existing Auth/RLS/roles policies.
- Identify UI/component system, test runner, lint/format tools, and deployment setup.
- Run existing build/lint/tests.
- If a Supabase project is linked, inspect configuration without exposing secrets.
- Write/update `IMPLEMENTATION_STATUS.md` with current-state findings and a file-by-file plan.

**Do not:** scaffold Express/Prisma or another backend.

**Done when:**

- Current app and Supabase state are documented.
- Existing failures are documented.
- Agent has a concrete plan for Step 1.

## Step 1 - React + Supabase project foundations

**Goal:** establish the agreed architecture if missing.

Tasks:

- Ensure React + TypeScript + Vite app boots in strict mode.
- Add/configure `@supabase/supabase-js`.
- Initialize `supabase/` with Supabase CLI if not already present.
- Add environment validation for `VITE_SUPABASE_URL` and publishable/anon key.
- Create a single reusable browser Supabase client module.
- Set up lint/format/test scripts.
- Add React Router/application shell.
- Add TanStack Query, React Hook Form, Zod, Tailwind/component primitives if not already present and justified.
- Add commands for local Supabase start/reset/test and frontend dev/build.
- Add CI-friendly build/lint/test commands.

**Done when:**

- Frontend starts.
- Supabase local stack can start (or existing remote dev project is documented if local is not available).
- App can perform a simple safe Supabase connectivity check.
- Build/lint/test baseline is green or known pre-existing failures are recorded.

## Step 2 - Database schema, migrations, RLS foundation, and seed

**Goal:** establish V1 domain/data security before feature UI.

Create migrations for:

- `profiles` linked to `auth.users`.
- roles.
- permissions.
- role_permissions.
- profile_roles (or equivalent assignment).
- customers.
- products.
- offers.
- offer_items.
- orders.
- order_items.
- payments.
- deliveries.
- order_events/audit events.
- idempotency/public request table if used.

Tasks:

- Add enums/check constraints/state values.
- Add unique constraints/indexes.
- Add immutable/historical snapshot fields where required.
- Enable RLS on every exposed table.
- Start with deny-by-default policies, then add minimal read/write policies per role.
- Add helper SQL functions such as `has_permission(...)` if appropriate, designed carefully to avoid RLS recursion/security issues.
- Seed roles, permissions, product, 1/2/3-pack offers, and non-production fixtures.
- Bootstrap Executive Admin via a secure admin script/process, not public SQL containing a password.
- Generate TypeScript database types from Supabase schema if part of repo conventions.

Tests:

- Migration/reset from zero.
- Basic constraints/indexes.
- RLS denies anon access to internal tables.
- Order Manager/Executive Admin policy smoke tests.

**Done when:**

- Fresh local Supabase reset succeeds.
- Required schema exists with RLS enabled.
- Seed data exists.
- Unauthorized direct table access is denied.

## Step 3 - Supabase Auth and RBAC vertical slice

**Goal:** staff can authenticate and authorization is enforced by Supabase.

Backend/Supabase tasks:

- `profiles` creation/link strategy for new auth users.
- Role assignment model.
- `has_permission`/authorization helpers where required.
- RLS policies for profile/staff access.
- `invite-staff` Edge Function using service-role/Admin Auth API and Executive Admin authorization.
- Deactivation strategy that blocks RLS/business operations and disables Auth user where appropriate.

Frontend tasks:

- Login.
- Forgot Password.
- Reset Password.
- Accept Invite / Set Password.
- Auth provider using Supabase session + `onAuthStateChange`.
- Protected routes.
- Role-aware navigation.
- Session-expired/recovery handling.

Tests:

- Valid/invalid login.
- Unauthenticated internal query denied.
- Order Manager blocked from Executive Admin-only data/function.
- Invite function rejects non-admin callers.
- Deactivated user cannot continue privileged operations.

**Done when:**

- Executive Admin and Order Manager can log in.
- UI reflects permissions.
- Direct Supabase calls cannot bypass authorization.

## Step 4 - Product/offer and pricing database services

**Goal:** centralize authoritative pricing in Postgres.

Tasks:

- Seed/verify product and 1/2/3-pack offers.
- Implement SQL/RPC helpers to resolve active offer and calculate effective price.
- Implement prepaid incentive calculation.
- Expand configured bonus items (e.g. free balm) at zero price where applicable.
- Expose a safe RLS-protected active-offers read model for checkout/internal forms.

Tests:

- Correct totals for each package.
- Client-provided price is never authoritative.
- Historical order snapshot remains unchanged after future offer edits.
- Prepaid incentive calculation.
- Bonus item expansion.

**Done when:**

- Every order-creation path can derive authoritative totals from Supabase data/functions.

## Step 5 - Public acquisition -> operational order vertical slice

**Goal:** the conversion landing page can create a complete operational order.

Tasks:

- Implement `create-public-order` Supabase Edge Function.
- Validate payload with Zod.
- Add phone normalization logic and tests.
- Implement one transactional Postgres function for customer find/create + order/items/payment/delivery/event creation.
- Resolve offer and totals inside the trusted backend path.
- Capture attribution/UTM/click IDs.
- Add idempotency-key handling.
- Add duplicate-order warning logic.
- Add anti-abuse/rate-limiting approach.
- Return public-safe order number and next-step message only.

Tests:

- New customer/order.
- Existing normalized phone reuses customer.
- Nigerian phone normalization variants.
- Invalid/inactive offer rejected.
- Malicious client price ignored.
- Duplicate warning.
- Transaction rollback.
- Idempotent retry.
- Anon user cannot directly insert internal order records.

**Done when:**

- A request to the Edge Function creates a fully linked order visible to authorized staff.

## Step 6 - Orders queue, order detail, and manual WhatsApp order

**Goal:** Order Manager can operate incoming orders.

Supabase tasks:

- RLS-safe paginated order list query/view/RPC.
- Search by order number/name/normalized phone.
- Filters by status/source/date/payment.
- Order-detail query/view including customer, items, payment, delivery, attribution, timeline.
- `create_manual_order(...)` RPC with permission check and same pricing/order creation invariants.
- Safe editable-field RPC where direct update would be too permissive.

Frontend tasks:

- Operations shell/navigation.
- Orders list/table/cards.
- Quick status tabs.
- Search/filter/pagination.
- Order detail.
- Manual Create Order form.
- WhatsApp and call deep links.
- Loading/error/empty states.

Tests:

- RLS/list visibility.
- Pagination/filter/search.
- Manual order permission.
- Order detail authorization.

**Done when:**

- Order Manager can find a landing-page order and create a WhatsApp/manual order from the UI.

## Step 7 - Order state RPC commands and audit timeline

**Goal:** enforce operational workflow in Postgres, not the browser.

Implement authoritative RPC functions:

- mark contacted.
- mark unreachable.
- confirm.
- cancel with reason.
- complete when requirements pass.
- Executive Admin override with mandatory reason.

Every command must:

- derive actor from `auth.uid()`.
- verify permission.
- lock/read current state safely.
- validate transition.
- update records.
- append audit/order event in the same transaction.

Frontend:

- Context-aware primary actions.
- Confirm Order modal/drawer.
- Mark Unreachable.
- Cancel with reason.
- Timeline.

Tests:

- Valid transition matrix.
- Invalid direct/status mutation denied or ineffective.
- Every command produces one correct event.
- Override restricted to Executive Admin.

**Done when:**

- Impossible workflow states cannot be produced through normal client credentials.

## Step 8 - Delivery workflow

**Goal:** confirmed orders can move through scheduling, dispatch, and outcome.

Supabase RPCs:

- `schedule_delivery`.
- reschedule where allowed.
- `dispatch_order`.
- `mark_order_delivered`.
- `fail_delivery` with reason.
- retry scheduling path.

Frontend:

- Schedule Delivery modal.
- Dispatch modal.
- Delivered action.
- Failed Delivery modal.
- Delivery summary.
- Today's delivery/failure queues.

Tests:

- Cannot schedule unconfirmed order.
- Cannot dispatch unscheduled delivery.
- Cannot normally deliver before dispatch.
- Failure requires reason.
- Retry scheduling rules.

**Done when:**

- Confirmed order can complete delivery success/failure from the UI with audited RPC transitions.

## Step 9 - Payment workflow

**Goal:** COD works end-to-end; prepaid architecture is secure and provider-ready.

COD:

- `mark_cod_paid` RPC with authorization and idempotent behavior.
- Display amount due/status.
- Audit payment event.
- Completion rule requires delivered + paid.

Prepaid:

- `initialize-prepaid-payment` Edge Function.
- Provider adapter inside Edge Function/shared function code.
- Mock/test provider if production provider not selected.
- Provider webhook Edge Function with signature validation and secrets.
- Idempotent provider event handling through database uniqueness/RPC.

Tests:

- Duplicate COD marking safe.
- COD completion fails if delivered but unpaid.
- Valid payment enables completion.
- Webhook idempotency/signature failure.

**Done when:**

- COD order can reach completed state correctly and prepaid path is safely testable.

## Step 10 - Customers module

**Goal:** staff can understand customer history without a full CRM.

Supabase:

- RLS-protected paginated customer list.
- Search by name/phone.
- Customer detail view/RPC.
- Customer order history.
- Derived counts/spend based on paid/completed rules.

Frontend:

- Customers list.
- Customer detail.
- Order-history links.
- Operational summary cards.

Tests:

- Repeat customer aggregation.
- Spend rules.
- RLS visibility.

**Done when:**

- Staff can open any repeat customer's history from an order or customer search.

## Step 11 - Dashboards and Executive Admin analytics

**Goal:** give each role the right overview without large client-side aggregation.

Implement security-aware views/RPCs:

- `get_operations_dashboard(...)`.
- `get_executive_dashboard(...)`.

Operations metrics:

- New orders.
- Awaiting confirmation.
- Unreachable.
- Today's scheduled deliveries.
- Failed deliveries requiring action.

Executive metrics:

- Submitted/confirmed/delivered/completed orders.
- Submitted order value.
- Delivered/paid revenue.
- COD success rate.
- Cancellation/failure rates.
- Funnel conversion.
- Source/channel breakdown.

Tests:

- Aggregates match seeded known dataset.
- Order Manager cannot call executive-only metrics.

**Done when:**

- Executive Admin can answer operational health questions from the application.

## Step 12 - Staff management, settings, and offers

**Goal:** normal administration no longer requires manual Supabase dashboard edits.

Supabase/Edge Functions:

- List staff through safe profile view.
- Invite staff Edge Function.
- Role/access update function.
- Activate/deactivate staff function with audit event.
- Settings read/update RPC.
- Offer update RPC if included in V1.

Frontend:

- Staff list.
- Invite form.
- Staff detail/edit.
- Settings.
- Offer configuration if enabled.

Tests:

- Executive-only authorization.
- Deactivated staff blocked.
- Service-role operations inaccessible to browser.
- Settings/offer changes audited.

**Done when:**

- Executive Admin can manage normal internal access/settings without engineering intervention.

## Step 13 - Production hardening and release

**Goal:** make Nouri V1 safe and operable on Supabase.

Tasks:

- Review every table for RLS enabled/policies tested.
- Review every `SECURITY DEFINER` function for fixed `search_path`, least privilege, and caller validation.
- Review Edge Function CORS, auth verification, validation, and secrets.
- Confirm service-role key is absent from frontend bundle and repository history.
- Review anti-abuse/rate-limiting for public order flow.
- Validate production redirect URLs for Supabase Auth.
- Configure production Edge Function secrets.
- Add error tracking/logging hooks.
- Run dependency/security audit.
- Protect bootstrap/admin scripts from accidental production misuse.
- Validate migration deployment procedure and backup/recovery notes.
- Verify indexes/query plans with representative data.
- Verify pagination/dashboard performance.
- Redact phone/address values from logs where practical.
- Run full build/unit/Supabase integration/E2E suite.

**Done when:**

- Production configuration fails safely when critical configuration is missing.
- RLS/function authorization tests are green.
- Build/lint/test/E2E critical flows are green.
- Release checklist and rollback/migration notes are documented.

---

# 29. Suggested Milestones

## Milestone 1 - Secure shell

Steps 0-3.

Outcome: authenticated RBAC web application exists.

## Milestone 2 - Acquisition to operations

Steps 4-6.

Outcome: landing page/manual order creates a real order and staff can view it.

## Milestone 3 - Order to delivery

Steps 7-8.

Outcome: staff can manage confirmation and delivery lifecycle.

## Milestone 4 - Delivery to cash

Step 9.

Outcome: COD/prepaid payment state and completion logic are correct.

## Milestone 5 - Operational intelligence

Steps 10-12.

Outcome: customer history, dashboards, staff management, and settings are usable.

## Milestone 6 - Release readiness

Step 13.

Outcome: production-ready V1.

---

# 30. Definition of Done for Every Feature

A feature is not done when only the UI exists.

For each feature, the agent must confirm:

- Data model/migration complete if needed.
- Supabase database function/RPC/Edge Function business logic complete where required.
- Validation complete.
- RLS/permission check complete.
- Supabase query/view/RPC/Edge Function contract complete.
- Audit event complete where applicable.
- Frontend loading/error/empty states complete.
- Tests added/updated.
- Documentation/environment updates complete.
- No known TypeScript/lint/build errors.
- Manual happy-path verification completed.

---

# 31. Recommended Agent Checkpoint Report Format

After every step, report:

```text
STEP COMPLETED:

1. What was implemented
2. Files/modules changed
3. Database migrations
4. Supabase tables/views/RPCs/Edge Functions added/changed
5. UI routes/screens added/changed
6. Tests added and current result
7. How to run/verify locally
8. Assumptions made
9. Open blockers/TODOs
10. Recommended next step
```

Do not silently move on after a failing migration, failing test suite, or unresolved security issue.

---

# 32. Phase 2 Hooks to Preserve Without Building Now

The V1 data model should make these future features possible without implementing them now:

- WhatsApp Business API notifications.
- Reorder reminders.
- Customer segmentation.
- Expected depletion/replenishment date.
- Retention campaigns.
- Repeat-order analytics.
- Ad-platform spend ingestion/CAC.
- More detailed fulfilment/inventory.
- Courier/logistics integrations.
- Customer service conversation history.

Preserve reliable customer identity, attribution, order history, delivery outcome, and payment outcome because these are the foundations of retention.

---

# 33. Final V1 Product Statement

Nouri Operations V1 is successful when a paid-social or manually assisted customer order can enter one system, be securely processed by an Order Manager from contact through fulfilment, be reconciled for delivery and payment, and be overseen by an Executive Admin with reliable attribution, audit history, customer history, and operational metrics.

The implementation priority is therefore:

```text
AUTH + RBAC
    -> DOMAIN + DATABASE
    -> PUBLIC ORDER INTAKE
    -> ORDERS QUEUE + DETAIL
    -> ORDER STATE COMMANDS
    -> DELIVERY
    -> PAYMENT
    -> CUSTOMERS
    -> EXECUTIVE DASHBOARD
    -> STAFF/SETTINGS
    -> HARDENING
```

Build these as vertical, testable slices. Avoid scope expansion until the above loop is stable end to end.
