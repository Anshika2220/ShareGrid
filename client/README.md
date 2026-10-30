# ShareGrid client

The ShareGrid React frontend lives entirely in this directory.

## Requirements

- Node.js 20.19+ or 22.12+
- The ShareGrid backend running at `http://localhost:5000`

## Setup

1. Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` if the backend uses a different address.
2. Install dependencies with `npm install`.
3. Start the frontend with `npm run dev`.

The development server runs at `http://localhost:5173`. The API client uses the configured `VITE_API_BASE_URL` (defaulting to `http://localhost:5000/api`) and checks `GET /health` on startup.

## Structure

- `src/components/` — reusable layout and UI components
- `src/constants/` — shared backend status values
- `src/hooks/` — reusable React state and effects
- `src/pages/` — route-level screens
- `src/services/` — centralized API client and endpoint services

## Routes

- `/` — public landing page
- `/resources` — resource catalogue placeholder (no fake listings)
- `/resources/:resourceId` — resource details placeholder
- `/list-resource` — six-step listing wizard with local validation (submission pending backend integration)
- `/dashboard` — role-neutral dashboard shell with backend-pending states
- `/bookings` — booking activity placeholder (no mock transactions)
- `/bookings/:bookingId` — booking detail and status-history placeholder
- `/conversations` — negotiation list placeholder (no mock conversations)
- `/conversations/:conversationId` — transaction-specific negotiation placeholder
- `/profile` — profile form draft (backend read/save pending)
- `/notifications` — notification centre placeholder (no mock notifications)
- `/login` — login form (backend integration pending)
- `/register` — registration form (backend integration pending)
- `/forgot-password` — password recovery form (backend integration pending)
- `/health` — backend connectivity status
- `*` — not-found page

## Backend dependency

The backend must implement `GET /api/health` and return the agreed success envelope. Resource, account, booking, payment, and admin screens are being built module by module; their API integrations will wait until the backend contract is available. The resource pages explicitly show that integration is pending and do not display mock inventory.

## Available scripts

- `npm run dev` — start Vite
- `npm run build` — create a production build
- `npm run lint` — run Oxlint
- `npm run preview` — preview the production build
