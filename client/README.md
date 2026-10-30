# ShareGrid client

The ShareGrid React frontend lives entirely in this directory.

## Requirements

- Node.js 20.19+ or 22.12+
- The ShareGrid backend running at `http://localhost:5000`

## Setup

1. Copy `.env.example` to `.env.local` and set `VITE_API_URL` if the backend uses a different address.
2. Install dependencies with `npm install`.
3. Start the frontend with `npm run dev`.

The development server runs at `http://localhost:5173`. The API client uses the configured `VITE_API_URL` (defaulting to `http://localhost:5000/api`) and checks `GET /health` on startup.

## Available scripts

- `npm run dev` — start Vite
- `npm run build` — create a production build
- `npm run lint` — run Oxlint
- `npm run preview` — preview the production build
