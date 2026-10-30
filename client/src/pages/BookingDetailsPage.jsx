import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  MessageSquareText,
  PackageCheck,
  ShieldAlert,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import IntegrationNotice from '../components/common/IntegrationNotice.jsx'

const pendingSections = [
  {
    title: 'Booking status and history',
    description: 'Every status change and timestamp will come from the backend.',
    Icon: ClipboardCheck,
  },
  {
    title: 'Dates and availability',
    description: 'Requested dates, buffers, and eligibility are backend-authoritative.',
    Icon: CalendarDays,
  },
  {
    title: 'Payment and deposit',
    description: 'Amounts, payment state, refund terms, and decisions are not available yet.',
    Icon: CircleDollarSign,
  },
  {
    title: 'Handover and return',
    description: 'Condition reports, photos, and confirmations will appear after integration.',
    Icon: PackageCheck,
  },
]

function BookingDetailsPage() {
  const { bookingId } = useParams()

  return (
    <section className="mx-auto min-h-[70vh] max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-black"
        to="/bookings"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Bookings
      </Link>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Transaction</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">
            Booking details
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Booking reference <code className="font-mono text-slate-900">{bookingId}</code>
          </p>
        </div>
        <span className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          Status unavailable
        </span>
      </div>

      <div className="mt-7">
        <IntegrationNotice>
          This reference has not been looked up. Booking state, resource details, dates, eligibility,
          prices, and next actions must come from the backend; none are inferred from the URL.
        </IntegrationNotice>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
        <div className="space-y-4">
          {pendingSections.map(({ title, description, Icon }) => (
            <section className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" key={title}>
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-800">
                <Icon aria-hidden="true" size={19} />
              </span>
              <div>
                <h2 className="font-semibold text-slate-950">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                <p className="mt-3 text-xs font-medium text-slate-500">Waiting for booking data</p>
              </div>
            </section>
          ))}
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-950">Next steps</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The next action depends on the real booking status and whether you’re the seeker or provider.
          </p>
          <div className="mt-5 grid gap-3">
            <button
              className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500"
              disabled
              title="Booking actions are unavailable until the backend returns this transaction."
              type="button"
            >
              Continue booking
            </button>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              to="/conversations"
            >
              <MessageSquareText aria-hidden="true" size={16} />
              Negotiations
            </Link>
          </div>
          <p className="mt-5 flex items-start gap-2 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
            <ShieldAlert aria-hidden="true" className="mt-0.5 shrink-0" size={15} />
            Don’t pay or hand over a resource based on an unverified status.
          </p>
        </aside>
      </div>
    </section>
  )
}

export default BookingDetailsPage
