import {
  ArrowLeft,
  Bell,
  CalendarCheck,
  CircleDollarSign,
  MessageSquareText,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import IntegrationNotice from '../components/common/IntegrationNotice.jsx'

const notificationTypes = [
  {
    title: 'Bookings and handovers',
    description: 'Requests, decisions, check-in, and return reminders.',
    Icon: CalendarCheck,
  },
  {
    title: 'Offers and messages',
    description: 'Negotiation updates and transaction conversations.',
    Icon: MessageSquareText,
  },
  {
    title: 'Payments and deposits',
    description: 'Payment confirmations, refunds, and deposit reviews.',
    Icon: CircleDollarSign,
  },
  {
    title: 'Verification and account',
    description: 'Evidence review, profile, and reputation updates.',
    Icon: ShieldCheck,
  },
]

function NotificationsPage() {
  return (
    <section className="mx-auto min-h-[70vh] max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-black"
        to="/dashboard"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        My ShareGrid
      </Link>

      <div className="mt-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Stay in the loop</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">
            Notifications
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Important updates about your ShareGrid activity, all in one place.
          </p>
        </div>
        <span className="hidden size-12 shrink-0 place-items-center rounded-xl bg-green-50 text-green-700 sm:grid">
          <Bell aria-hidden="true" size={22} />
        </span>
      </div>

      <div className="mt-8">
        <IntegrationNotice>
          Notifications and unread status aren’t connected to the backend yet. No sample alerts are
          shown, and mark-as-read is unavailable until it can update the real account.
        </IntegrationNotice>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">What you’ll hear about</h2>
            <p className="mt-1 text-sm text-slate-600">Updates are tied to your bookings, listings, and account.</p>
          </div>
          <button
            className="w-fit cursor-not-allowed rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-400"
            disabled
            title="Notifications are not connected yet."
            type="button"
          >
            Mark all as read
          </button>
        </div>

        <ul className="divide-y divide-slate-200">
          {notificationTypes.map(({ title, description, Icon }) => (
            <li className="flex items-start gap-4 py-5" key={title}>
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-800">
                <Icon aria-hidden="true" size={19} />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-2 rounded-xl bg-slate-50 px-5 py-8 text-center">
          <p className="font-semibold text-slate-950">No live notifications yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            When notifications are connected, your real updates will appear here.
          </p>
        </div>
      </div>
    </section>
  )
}

export default NotificationsPage
