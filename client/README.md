# ShareGrid client

The ShareGrid React frontend lives entirely in this directory and connects to the API in `../server`.

## Requirements

- Node.js 20.19+ or 22.12+
- ShareGrid backend running at `http://localhost:5000`

## Setup

1. Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` if the backend uses a different address.
2. Install dependencies with `npm install`.
3. Start the frontend with `npm run dev`.

The development server runs at `http://localhost:5173`. The API client uses `VITE_API_BASE_URL` (default `http://localhost:5000/api`) and checks the backend health endpoint on startup. Authenticated requests use the session token managed by the auth context.

## Connected routes

- `/` — landing page and backend health indicator
- `/resources` and `/resources/:resourceId` — searchable catalogue, availability, reviews, booking requests, and conversations
- `/list-resource` — listing creation and ownership verification
- `/dashboard` — bookings, listings, verification, organisation, and notification summaries
- `/bookings` and `/bookings/:bookingId` — bookings, decisions, payment, deposit, and inspection actions
- `/bookings/:bookingId/handover` — check-in/check-out details and confirmations
- `/bookings/:bookingId/incident` and `/incidents/:incidentId` — incident reports and eligible appeals
- `/bookings/:bookingId/review` — eligible transaction reviews
- `/conversations` and `/conversations/:conversationId` — messages and negotiation offers
- `/organisations` — organisation membership, evidence, and member management
- `/admin` — role-protected verification, organisation, incident, review, user, policy, booking, audit, and payment-refund tools
- `/profile` — profile, password, and phone verification
- `/notifications` — notifications and read status
- `/login`, `/register`, `/forgot-password`, and `/reset-password` — account access and recovery
- `/verify-email` — email verification
- `/health` — backend connectivity status
- `*` — not-found page

Protected routes redirect signed-out visitors to login. API failures are surfaced in the relevant screen; the frontend does not substitute mock records for API data.

## Available scripts

- `npm run dev` — start Vite
- `npm run build` — create a production build
- `npm run lint` — run Oxlint
- `npm run preview` — preview the production build
