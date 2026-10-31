# ShareGrid Server

Standalone Express/MongoDB API for ShareGrid. The React frontend remains outside this directory.

## Requirements

- Node.js 20+
- MongoDB. For local development, a standalone instance works for single-document atomic reservation updates. Use a replica set when adding multi-document transactions.
- Optional: SMTP account for email verification and password-reset messages.

## Setup

From `ShareGrid/server`:

```powershell
npm install
Copy-Item .env.example .env
```

Set `MONGO_URI`, a random `JWT_SECRET` of at least 32 characters, `CLIENT_URL`, and an optional comma-separated `ADMIN_EMAILS` allowlist in `.env`. Register an allowlisted address to provision an admin account. Never commit `.env`.

Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` for signed uploads of public listing and handover photos. The API secret remains server-side; authenticated users receive short-lived upload signatures scoped to their own folder. The free Cloudinary tier can be used subject to its current storage, transformation, and bandwidth limits. Private invoice, possession, and organisation evidence remains on local disk under `PRIVATE_UPLOAD_DIR` and is served only after API authorization.

Payment processing is demo-only: set `DEMO_PAYMENTS_ENABLED=true` to exercise booking payment flows in non-production environments. Demo payments and refunds only update test records; they never move money. Real payment processing is not configured and is unavailable in production.
Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `MAIL_FROM` to deliver verification and password-reset emails. Do not expose SMTP credentials to the frontend.
Phone verification uses Twilio when `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and either `TWILIO_PHONE_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID` are set. Phone numbers must use E.164 format. In development without Twilio, the API returns the one-time code for local testing; production phone verification fails closed if SMS is not configured.

Start:

```powershell
npm run dev
```

or `npm start` for a normal process. Health check: `GET http://localhost:5000/api/health`.

## Tests

```powershell
npm test
```

Tests include business-rule tests and API integration tests against an ephemeral MongoDB instance.

## Structure

- `src/config` — environment and MongoDB
- `src/models` — Mongoose models and indexes
- `src/routes` — API modules
- `src/services` — pricing, policy, notification and business rules
- `src/middleware` — authentication, authorization and error handling
- `tests` — focused business-rule tests
- `scripts` — local module-load check
- `docs` — API contract, business rules and schema

## Security and deployment notes

- Public listing and handover photos use signed Cloudinary uploads. Private verification and organisation files are stored locally under `PRIVATE_UPLOAD_DIR`, are never statically served, and are streamed only after server-side authorization.
- Configure and rotate secrets outside source control. Use HTTPS and a trusted reverse proxy in production.
- Email and SMS delivery require provider configuration. Development verification tokens are returned by the API only when delivery is not configured; production account flows require their respective providers.
- Listing and handover photos are uploaded directly to Cloudinary with authenticated, user-scoped signatures. Private uploads cover ownership and organisation evidence and remain local-only.
- Existing evidence records stored by a retired external storage provider must be migrated or re-uploaded; the API does not access those providers.
- Default policy values, integration limitations, and lifecycle rules are detailed in `docs/BUSINESS_RULES.md`.

See `docs/API_CONTRACT.md` for endpoint request and response behavior.
