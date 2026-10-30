import { ArrowLeft, ArrowRight, MessageSquareText } from 'lucide-react'
import { Link } from 'react-router-dom'
import IntegrationNotice from '../components/common/IntegrationNotice.jsx'

function ConversationsPage() {
  return (
    <section className="mx-auto min-h-[70vh] max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-black"
        to="/dashboard"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        My ShareGrid
      </Link>

      <div className="mt-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Booking conversations</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">
          Negotiations
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Keep resource questions, dates, and offers connected to a transaction.
        </p>
      </div>

      <div className="mt-8">
        <IntegrationNotice>
          Conversations, message history, offer rounds, permitted price ranges, and limits must be
          returned by the backend. No example messages or offer values are shown.
        </IntegrationNotice>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center sm:px-10">
        <span className="mx-auto grid size-14 place-items-center rounded-lg bg-slate-100 text-slate-900">
          <MessageSquareText aria-hidden="true" size={25} />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-slate-950">Your transaction conversations will appear here</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
          Negotiations are only available when attached to a real resource or booking. Once connected,
          you’ll see the asking price, active offer, history, and remaining limits supplied by ShareGrid.
        </p>
        <Link
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          to="/bookings"
        >
          View bookings <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </div>
    </section>
  )
}

export default ConversationsPage
