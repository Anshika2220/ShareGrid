# ShareGrid business rules

## Accounts and access

- Every normal account can both list and rent resources; `roles` is for authorization, not marketplace identity. Phone verification codes are hashed, expire after ten minutes, allow at most five guesses, and become invalid when the profile phone number changes.
- Passwords use bcrypt, and JWTs include a token version so logout, password changes, and suspension invalidate prior tokens.
- Only active admin users may review verification, incidents, policies, and moderation queues. Configure the initial admin email allowlist before registration using `ADMIN_EMAILS`; do not commit it.
- Resource, booking, conversation, review, and private evidence access is checked on the server.

## Resources and verification

- A resource needs all required fields and at least four Cloudinary photos uploaded with the owner's signed upload scope. It is created as a draft.
- Only active resources with approved ownership verification are discoverable and bookable.
- Invoice and no-invoice routes have separate answer requirements. Organisation-owned assets require an approved organisation and an authorised representative.
- Organisation owners can add existing users as representatives, submit private registration/authorisation evidence, and revoke non-owner memberships. Approval requires registration or representative-authorisation evidence and an admin review; decisions are auditable.
- Listing and handover photos are public Cloudinary images, uploaded through signed parameters scoped to the current user. Verification and organisation evidence remain local-only, are never statically served, and are streamed only after an ownership/admin check.
- Possession challenges are random six-digit one-use codes, hashed in storage, expire after ten minutes, and are atomically consumed when proof is submitted. The code check does not itself constitute approval; a reviewer must inspect the evidence.

## Price and negotiation

- Listing price is the owner's asking price. A configurable policy computes the minimum and maximum permitted unit price.
- Demo defaults are 80%–110% of asking price. This is an example configuration, not an immutable platform policy. Configure category overrides through the admin policy API.
- Offers and counteroffers outside that range are rejected. Only the other participant can accept/reject an offer. Booking requests may reference an accepted offer to lock its unit price.

## Availability and fair use

- Booking requests are pending until the provider approves them. Pending requests do not reserve dates.
- On approval, a single atomic MongoDB resource update checks and creates the reservation, preventing concurrent approvals from overlapping.
- Reservation end includes the configured resource/category inspection buffer. Owner-blocked periods are checked at approval.
- Default inspection buffer is zero until changed by an admin. This is intentionally configurable rather than a guessed fixed duration.
- Platform fair-use values default to unlimited. Admins may set active booking and rolling usage limits by category; owners can add stricter per-resource limits, which cannot override a stricter platform limit.
- MongoDB standalone deployments support the atomic reservation update. Configure a replica set for multi-document transactional extensions.

## Payment and deposits

- Booking and payment statuses are independent. Provider approval is not confirmation; a booking becomes confirmed only after its payment is verified.
- Payment processing is demo-only and must be explicitly enabled with `DEMO_PAYMENTS_ENABLED=true` outside production. Demo payments, refunds, and deposit ledger entries never transfer money.
- An optional deposit is included in the demo booking amount and recorded separately as held. Deposit refunds and deductions are auditable ledger records only.
- A deposit deduction can only be recorded by an admin while resolving an incident. Allegations do not directly alter deposits or Honor Score.

## Handover, reviews, incidents, and reputation

- Check-in/out records are timestamped, associated with a booking, and retain conditions, photos, accessories, and notes.
- A provider must complete inspection after the configured return buffer before the booking becomes completed.
- Each participant can submit one review per completed booking. Reviews are capped at 50 words and five-star values are distinct from Honor Score.
- Incidents require human review. Only an administrator's resolved decision can apply a configured Honor Score adjustment or approve a deposit deduction.
- Score history records each adjustment, reviewer, reason, and booking reference.
- Honor Score starts at zero on a 0–100 scale; only configured positive completion events or reviewed decisions change it.
- Honor Score deductions default to zero and must exactly match a configured incident-type policy; an admin cannot invent an unconfigured penalty while resolving a report.
- An appeal can reverse an Honor Score adjustment with an auditable compensating history entry. Reversing an already-recorded deposit refund/deduction requires separate manual ledger review and is not automated.

## Explicit integration limitations

- Email verification and password-reset flows use expiring, hashed one-time tokens. Configure SMTP before production use; development exposes one-time email tokens in responses only when SMTP is not configured. Phone verification uses Twilio when configured; development exposes a one-time code only when SMS is not configured, while production requires Twilio credentials.
- Resource and handover photographs must be uploaded to the configured Cloudinary account; the API rejects URLs outside the current user's signed folder. Private evidence is local-only. Existing evidence records from a retired external storage provider require migration or re-upload.
- Admin role provisioning is an email allowlist at registration, not a separate invitation flow.
- Human verification, incident, damage, and deposit decisions require an operator; no automated penalty is applied.
