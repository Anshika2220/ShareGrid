import { ArrowLeft, CircleAlert, CircleCheck, LoaderCircle, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'

function HealthPage({ health }) {
  const isOnline = health.state === 'online'
  const isLoading = health.state === 'loading'
  const Icon = isLoading ? LoaderCircle : isOnline ? CircleCheck : CircleAlert
  const statusLabel = isLoading ? 'Checking connection' : isOnline ? 'API connected' : 'API unavailable'

  return (
    <section className="mx-auto min-h-[65vh] max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700" to="/">
        <ArrowLeft aria-hidden="true" size={16} /> Back to ShareGrid
      </Link>
      <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Service status</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          API connection
        </h1>
        <p className="mt-3 max-w-xl leading-7 text-slate-600">
          ShareGrid checks the backend health endpoint to confirm the service is reachable.
        </p>

        <div className={`mt-8 flex items-start gap-4 rounded-2xl p-5 ${isOnline ? 'bg-emerald-50' : isLoading ? 'bg-slate-50' : 'bg-amber-50'}`}>
          <Icon
            aria-hidden="true"
            className={`mt-0.5 shrink-0 ${isOnline ? 'text-emerald-700' : isLoading ? 'animate-spin text-slate-500' : 'text-amber-700'}`}
            size={22}
          />
          <div aria-live="polite">
            <h2 className={`font-semibold ${isOnline ? 'text-emerald-950' : isLoading ? 'text-slate-900' : 'text-amber-950'}`}>
              {statusLabel}
            </h2>
            <p className={`mt-1 text-sm leading-6 ${isOnline ? 'text-emerald-800' : isLoading ? 'text-slate-600' : 'text-amber-900'}`}>
              {isLoading
                ? 'Requesting GET /health from the configured API.'
                : isOnline
                  ? 'The backend responded successfully.'
                  : health.message}
            </p>
          </div>
        </div>

        <button
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-wait disabled:opacity-70"
          disabled={isLoading}
          onClick={health.refresh}
          type="button"
        >
          <RefreshCw aria-hidden="true" className={isLoading ? 'animate-spin' : ''} size={16} />
          Check again
        </button>
      </div>
    </section>
  )
}

export default HealthPage
