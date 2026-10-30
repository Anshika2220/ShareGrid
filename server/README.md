# ShareGrid Server

Standalone Express/MongoDB API for ShareGrid. The React frontend remains outside this directory.

## Requirements

- Node.js 20+
- MongoDB. For local development, a standalone instance works for single-document atomic reservation updates. Use a replica set when adding multi-document transactions.
- Optional: Razorpay test credentials for live test-mode order/capture flows.
- Optional: SMTP account for email verification and password-reset messages.

## Setup

From `ShareGrid/server`:

```powershell
npm install
Copy-Item .env.example .env
```

Set `MONGO_URI`, a random `JWT_SECRET` of at least 32 characters, `CLIENT_URL`, and an optional comma-separated `ADMIN_EMAILS` allowlist in `.env`. Register an allowlisted address to provision an admin account. Never commit `.env`.

Configure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to use Razorpay test mode. Without those credentials, the server can use the explicitly-labelled demo payment flow only when `DEMO_PAYMENTS_ENABLED=true` outside production.
Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `MAIL_FROM` to deliver verification and password-reset emails. Do not expose SMTP credentials to the frontend.

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

- Private verification files are stored under `PRIVATE_UPLOAD_DIR` (default `server/private-uploads`) and are never statically served. Use an encrypted, access-controlled private volume or private object-storage adapter for production/multiple instances.
- Configure and rotate secrets outside source control. Use HTTPS and a trusted reverse proxy in production.
- Email/SMS delivery is not configured. Development reset tokens are returned by the API; production password-reset delivery requires an email provider.
- Listing/handover photos use caller-provided URLs. Upload validation and private storage currently cover verification documents only.
- Default policy values, integration limitations, and lifecycle rules are detailed in `docs/BUSINESS_RULES.md`.

See `docs/API_CONTRACT.md` for endpoint request and response behavior.
