import { ArrowLeft, ArrowRight, CalendarClock, MessageSquareText } from 'lucide-react'
import { Link } from 'react-router-dom'
import IntegrationNotice from '../components/common/IntegrationNotice.jsx'

function BookingsPage() {
  return (
    <section className="mx-auto min-h-[70vh] max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-black"
        to="/dashboard"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        My ShareGrid
      </Link>

      <div className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Your activity</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">
            Bookings
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Track rentals you request and requests for resources you share.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            to="/conversations"
          >
            <MessageSquareText aria-hidden="true" size={16} />
            Negotiations
          </Link>
          <Link
            className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
            to="/resources"
          >
            Find a resource <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <IntegrationNotice>
          Booking history is not connected yet. Statuses, dates, payment state, eligibility, and
          owner decisions must come from the backend; this page shows no sample transactions.
        </IntegrationNotice>
      </div>

      <div className="mt-10 rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center sm:px-10">
        <span className="mx-auto grid size-14 place-items-center rounded-lg bg-slate-100 text-slate-900">
          <CalendarClock aria-hidden="true" size={25} />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-slate-950">Your bookings will appear here</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
          Once bookings are connected, you’ll be able to follow each request from owner decision through return.
        </p>
        <Link
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          to="/resources"
        >
          Explore resources <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </div>
    </section>
  )
}

export default BookingsPage
