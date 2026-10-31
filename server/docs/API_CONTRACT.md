# ShareGrid API contract

Base URL: `http://localhost:5000/api`  
Content type: JSON, except verification and organisation evidence uploads (`multipart/form-data`, file field `file`).  
Authentication: `Authorization: Bearer <JWT>`. Admin routes additionally require the `admin` role.

## Response envelope

Success: `{"success":true,"message":"...","data":{...}}`  
Error: `{"success":false,"message":"...","errors":[]}`  
List endpoints return `data.items`; resource search also returns `data.pagination` (`page`, `limit`, `total`, `pages`). Dates are UTC ISO-8601. Money is INR.

## Health and accounts

| Method and path | Auth | Request |
|---|---|---|
| `GET /health` | No | — |
| `POST /auth/register` | No | `{name,email,phone?,password}`; password min 10 characters |
| `POST /auth/login` | No | `{email,password}` |
| `POST /auth/logout` | Yes | —; invalidates all active tokens for account |
| `GET /auth/me`, `GET /users/me` | Yes | — |
| `PATCH /users/me` | Yes | `{name?,phone?,profile?}` |
| `PATCH /auth/change-password` | Yes | `{currentPassword,newPassword}` |
| `POST /auth/forgot-password` | No | `{email}` |
| `POST /auth/reset-password` | No | `{token,password}` |
| `POST /auth/verify-email` | No | `{token}`; consumes one-time email token |
| `POST /auth/resend-verification` | No | `{email}` |
| `POST /auth/phone-verification/send` | Yes | —; sends a one-time code to the profile phone |
| `POST /auth/phone-verification/verify` | Yes | `{code}`; six digits, one use, 10-minute expiry, five attempts |
| `GET /users/:id/public-profile` | No | — |

## Resources and ownership verification

| Method and path | Auth | Request |
|---|---|---|
| `GET /resources` | No | Query: `category?`, `city?`, `q?`, `page?`, `limit?` |
| `GET /resources/mine` | Yes | — |
| `GET /resources/:id` | No | Returns permitted price range with approved listing |
| `POST /resources` | Yes | Listing fields; `images` requires at least 4 URLs; deposit optional |
| `PATCH /resources/:id` | Owner | Partial listing fields; changing identity fields returns the listing to verification |
| `DELETE /resources/:id` | Owner | Removes when no reservation exists |
| `PATCH /resources/:id/status` | Owner | `{status:"active"|"paused"}` |
| `GET /resources/:id/availability` | No | — |
| `GET /resources/:id/reviews` | No | — |
| `POST /verifications` | Yes | `{resourceId,route:"invoice"|"no_invoice",answers}` |
| `POST /verifications/:id/evidence` | Applicant/admin | multipart `file`, `kind` |
| `POST /verifications/:id/possession-challenge` | Applicant | —; returns one-time code and expiry |
| `POST /verifications/:id/possession-proof` | Applicant | multipart `file` and challenge `code` |
| `GET /verifications/mine` | Yes | — |
| `GET /verifications/evidence/:evidenceId` | Uploader, relevant owner/applicant, or admin | Private stream |
| `GET /admin/verifications` | Admin | Pending review queue |
| `GET /admin/verifications/:id` | Admin | Review details |
| `PATCH /admin/verifications/:id/decision` | Admin | `{decision:"approve"|"reject"|"request_evidence"|"under_review",reason}` |

## Bookings and handover

| Method and path | Auth | Request |
|---|---|---|
| `POST /bookings` | Yes | `{resourceId,start,end,offerId?}` |
| `GET /bookings/mine` | Yes | — |
| `GET /bookings/:id/eligibility` | Booking participant | Query: `resourceId`, `start`, `end` |
| `GET /bookings/:id` | Participant/admin | — |
| `PATCH /bookings/:id/decision` | Provider | `{decision:"approve"|"reject",reason?}` |
| `POST /bookings/:id/cancel` | Participant | — |
| `POST /bookings/:id/check-in` | Participant | Initial handover `{condition,photos,accessories,notes?}`; other party confirms with `{confirm:true}` |
| `POST /bookings/:id/check-out` | Participant | Seeker submits `{condition,photos,accessories,missingItems?,notes?}`; provider confirms with `{confirm:true}` |
| `GET /bookings/:id/handover` | Participant/admin | — |
| `POST /bookings/:id/complete-inspection` | Provider | `{reason}` |
| `POST /bookings/:id/deposit/refund` | Provider | `{reason}`; demo ledger entry only, no money is transferred |
| `GET /bookings/:id/deposit` | Participant/admin | Deposit ledger |
| `GET /admin/bookings` | Admin | — |

## Negotiation, payment, reviews and incidents

| Method and path | Auth | Request |
|---|---|---|
| `POST /conversations` | Yes | `{resourceId}` |
| `GET /conversations` | Yes | — |
| `GET /conversations/:id` | Participant | — |
| `PATCH /conversations/:id/block` | Participant | — |
| `POST /conversations/:id/messages` | Participant | `{body}` |
| `POST /conversations/:id/report` | Participant | `{messageId,reason}` |
| `POST /conversations/:id/offers` | Participant | `{amount,bookingId?}` |
| `POST /offers/:id/counter` | Other participant | `{amount}` |
| `PATCH /offers/:id/accept`, `PATCH /offers/:id/reject` | Other participant | — |
| `POST /payments/create-order` | Seeker | `{bookingId}`; non-production demo only when explicitly enabled |
| `POST /payments/verify` | Seeker | `{paymentId,demoPaymentConfirmed:true}`; explicitly enabled non-production demo only |
| `GET /payments/:id` | Payer/admin | — |
| `POST /payments/:id/refund` | Admin | `{reason}`; records a demo refund only, no money is transferred |
| `POST /reviews` | Participant | `{bookingId,rating:1..5,text}`; completed booking, max 50 words |
| `GET /users/:id/reviews` | No | — |
| `POST /reviews/:id/report` | Yes | `{reason}` |
| `POST /incidents` | Booking participant | `{bookingId,type,description,evidence?}` |
| `GET /incidents/mine`, `GET /incidents/:id` | Participant/admin | — |
| `POST /incidents/:id/appeal` | Participant | `{reason}` |
| `GET /admin/incidents` | Admin | — |
| `PATCH /admin/incidents/:id/decision` | Admin | `{status,reason,depositDecision?,depositDeduction?,honorAdjustment?}` |
| `PATCH /admin/incidents/:id/appeal` | Admin | `{decision:"uphold"|"reverse",reason}` |

## Organisation, notifications and administration

| Method and path | Auth | Request |
|---|---|---|
| `POST /organisations` | Yes | `{name,type,registrationNumber?}` |
| `GET /organisations/mine` | Member | — |
| `POST /organisations/:id/members` | Owner | `{email,role:"representative"|"member"}` |
| `DELETE /organisations/:id/members/:userId` | Owner | — |
| `POST /organisations/:id/evidence` | Owner/representative | multipart `file`, `kind:"registration_document"|"authorisation"|"asset_register"|"other"` |
| `GET /organisations/evidence/:evidenceId` | Uploader, authorised representative, or admin | Private stream |
| `GET /admin/organisations/queue` | Admin | Pending organisation review queue |
| `GET /admin/organisations/:id` | Admin | Review details and private evidence metadata |
| `PATCH /admin/organisations/:id/decision` | Admin | `{decision:"approve"|"reject"|"request_evidence"|"under_review",reason}` |
| `GET /notifications/mine` | Yes | — |
| `PATCH /notifications/:id/read` | Owner | — |
| `GET /admin/users` | Admin | — |
| `GET /admin/bookings` | Admin | Recent bookings |
| `PATCH /admin/users/:id/status` | Admin | `{status:"active"|"suspended"|"inactive",reason}` |
| `GET /admin/policies` | Admin | — |
| `PATCH /admin/policies` | Admin | `{key,category?,value}` |
| `GET /admin/audit-logs` | Admin | — |
| `GET /admin/reviews` | Admin | Reported reviews |
| `PATCH /admin/reviews/:id` | Admin | `{moderationStatus:"visible"|"hidden",reason}` |

Policy keys: `pricing`, `inspectionBufferHours`, `fairUse`, `negotiation`, `honorScore`. A policy may use category `"*"` as the default. Per-resource fair use may be set on listing create/update; usage limits require both a day limit and a rolling period. Defaults and policy types are described in [BUSINESS_RULES.md](./BUSINESS_RULES.md).

## State transitions

- Resource: `draft → active` only after admin verification; owner may pause/activate approved listings; removal is soft.
- Verification: `pending → under_review | additional_evidence_required | approved | rejected`.
- Booking: `requested → approved → confirmed → checked_out → returned → completed`; request may instead be rejected/cancelled. Payment success is required for `confirmed`.
- Payment: `created → paid | failed`; refunds are separately recorded and may become `refunded`.
- Incident: `open → under_review → resolved | dismissed`; any penalty requires a reviewed resolution.
- Deposit is optional. Its collection is kept as a held ledger record; refunds/deductions are separate, auditable entries.
