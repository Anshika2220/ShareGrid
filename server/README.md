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

Private evidence uses local disk by default. To use AWS S3 or an S3-compatible service, set `PRIVATE_STORAGE_DRIVER=s3`, `S3_BUCKET`, and `S3_REGION`. Set `S3_ENDPOINT` for compatible providers and keep `S3_FORCE_PATH_STYLE=true` when required by the provider. Credentials can use the AWS SDK default credential chain, or the paired `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` variables. Production endpoints must use HTTPS. Keep the bucket private and configure encryption at rest and lifecycle/backup policies with the provider.

Configure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to use Razorpay test mode. Without those credentials, the server can use the explicitly-labelled demo payment flow only when `DEMO_PAYMENTS_ENABLED=true` outside production.
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

- Private verification and organisation files are stored locally under `PRIVATE_UPLOAD_DIR` or in a private S3-compatible bucket. Files are never statically served and are streamed only after server-side authorization.
- Configure and rotate secrets outside source control. Use HTTPS and a trusted reverse proxy in production.
- Email and SMS delivery require provider configuration. Development verification tokens are returned by the API only when delivery is not configured; production account flows require their respective providers.
- Listing/handover photos use caller-provided URLs. Private uploads cover ownership and organisation evidence.
- Default policy values, integration limitations, and lifecycle rules are detailed in `docs/BUSINESS_RULES.md`.

See `docs/API_CONTRACT.md` for endpoint request and response behavior.
