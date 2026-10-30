import {
  ArrowRight,
  Bell,
  Boxes,
  CalendarDays,
  ClipboardList,
  HeartHandshake,
  Plus,
  ShieldCheck,
  Star,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import IntegrationNotice from '../components/common/IntegrationNotice.jsx'

const quickLinks = [
  {
    title: 'Find a resource',
    description: 'Explore equipment and spaces shared by your community.',
    to: '/resources',
    action: 'Explore resources',
    Icon: Boxes,
  },
  {
    title: 'List a resource',
    description: 'Make an underused resource available to someone who needs it.',
    to: '/list-resource',
    action: 'Create a listing',
    Icon: Plus,
  },
]

const pendingSections = [
  {
    title: 'Bookings',
    description: 'Your upcoming and past rentals will appear here.',
    to: '/bookings',
    action: 'View bookings',
    Icon: CalendarDays,
  },
  {
    title: 'Your listings',
    description: 'Create a listing now; management of submitted listings will be connected later.',
    to: '/list-resource',
    action: 'Start a listing',
    Icon: ClipboardList,
  },
]

function DashboardPage() {
  return (
    <section className="mx-auto min-h-[70vh] max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-green-700">Your ShareGrid</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">
            Your space to share.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Find resources when you need them and share what you have—all from one account.
          </p>
        </div>
        <Link
          className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          to="/list-resource"
        >
          <Plus aria-hidden="true" size={17} />
          List a resource
        </Link>
      </div>

      <div className="mt-8">
        <IntegrationNotice>
          Your profile, bookings, listings, verification, and reputation are not connected to the
          backend yet. No account data or statistics are shown until they can be loaded from ShareGrid.
        </IntegrationNotice>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {quickLinks.map(({ title, description, to, action, Icon }) => (
          <Link
            className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-slate-400 hover:shadow-sm"
            key={title}
            to={to}
          >
            <span className="grid size-11 place-items-center rounded-lg bg-slate-100 text-slate-900">
              <Icon aria-hidden="true" size={21} />
            </span>
            <h2 className="mt-5 text-lg font-semibold text-slate-950">{title}</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
              {action}
              <ArrowRight aria-hidden="true" className="transition group-hover:translate-x-1" size={16} />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-12 flex items-center justify-between gap-3 border-b border-slate-300 pb-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-600">Your activity</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">At a glance</h2>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {pendingSections.map(({ title, description, to, action, Icon }) => (
          <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" key={title}>
            <div className="flex items-start justify-between gap-4">
              <span className={`grid size-10 place-items-center rounded-lg ${title === 'Verification' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-800'}`}>
                <Icon aria-hidden="true" size={20} />
              </span>
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                Waiting for backend
              </span>
            </div>
            <h3 className="mt-5 font-semibold text-slate-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            <Link className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:underline" to={to}>
              {action} <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {[
          { title: 'Verification', Icon: ShieldCheck, description: 'Ownership review status will appear here.' },
          { title: 'Reputation', Icon: Star, description: 'Your rating and Honor Score will come from the backend.' },
          { title: 'Notifications', Icon: Bell, description: 'Booking and verification updates will appear here.' },
        ].map(({ title, Icon, description }) => (
          <article className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5" key={title}>
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-800">
              <Icon aria-hidden="true" size={19} />
            </span>
            <div>
              <h3 className="font-semibold text-slate-950">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-100 p-4 text-sm leading-6 text-slate-800">
        <HeartHandshake aria-hidden="true" className="shrink-0" size={19} />
        One ShareGrid account supports both renting resources and sharing your own.
      </div>
    </section>
  )
}

export default DashboardPage
