# Database schema

MongoDB/Mongoose models are defined in `src/models/index.js`. ObjectId references use strings at the REST boundary. Mongoose timestamps are UTC dates.

| Model | Purpose | Important relationships/indexes |
|---|---|---|
| `User` | Identity, credential hash, roles, profile, rating and Honor Score | Unique email; status |
| `Organisation` | Organisation metadata and review status | Creator; verification status |
| `Membership` | Authorised organisation representatives | Unique organisation/user pair |
| `Resource` | Listing, price/deposit, location, availability, verification, aggregate rating | Owner/category/city/status; text search; reservations |
| `Verification` | Invoice/no-invoice workflow, answers, reviewer, possession challenge | Unique resource; applicant/status |
| `VerificationEvidence` | Private uploaded ownership and possession evidence metadata | Verification/uploader |
| `OrganisationEvidence` | Private organisation registration, asset, and representative evidence metadata | Organisation/uploader |
| `Booking` | Booking lifecycle and independent payment state | Resource, seeker, provider, date/status |
| `Conversation`, `Message`, `Offer` | Resource-related negotiation and restricted chat | Conversation participants and offer state |
| `Payment` | Razorpay/demo payment, provider IDs and refund state | Booking, user, status |
| `DepositTransaction` | Held/refunded/deducted deposit ledger entries | Booking, user, payment, incident; one collection per booking |
| `HandoverRecord` | Timestamped initial and return records | Unique booking |
| `Review` | Mutual post-transaction ratings and moderation state | Unique booking/reviewer |
| `Incident` | Disputes, review decisions, appeal and audit trail | Booking, reporter, subject, status |
| `Notification` | In-app notifications | User, creation date |
| `AuditLog` | Admin and payment decisions | Actor, action, target |
| `PlatformPolicy` | Category-specific business configuration | Unique key/category |
| `HonorScoreHistory` | Reversible, attributed score changes | User, booking, incident |
| `UsageRecord` | Fair-use rolling usage records | Unique booking; user/resource |

Private evidence stores an opaque filename in the database; the physical file is outside the public web root. Secrets and password hashes are excluded from normal user projections.
