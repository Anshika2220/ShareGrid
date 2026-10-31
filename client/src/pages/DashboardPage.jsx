import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardCheck,
  HeartHandshake,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { api, getApiErrorMessage } from '../services/api.js'

function DashboardPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [resources, setResources] = useState([])
  const [verifications, setVerifications] = useState([])
  const [organisations, setOrganisations] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [errors, setErrors] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingResource, setUpdatingResource] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const requests = [
      ['Bookings', api.get('/bookings/mine', { signal: controller.signal }), (data) => setBookings(data.items)],
      ['Listings', api.get('/resources/mine', { signal: controller.signal }), (data) => setResources(data.items)],
      ['Verifications', api.get('/verifications/mine', { signal: controller.signal }), (data) => setVerifications(data.items)],
      ['Organisations', api.get('/organisations/mine', { signal: controller.signal }), (data) => setOrganisations(data.items)],
      ['Notifications', api.get('/notifications/mine', { signal: controller.signal }), (data) => setUnreadCount(data.items.filter((item) => !item.readAt).length)],
    ]

    Promise.all(requests.map(async ([label, request, update]) => {
      try {
        const { data } = await request
        update(data.data)
      } catch (error) {
        if (!controller.signal.aborted) setErrors((current) => [...current.filter((item) => item.label !== label), { label, message: getApiErrorMessage(error) }])
      }
    })).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false)
    })

    return () => controller.abort()
  }, [user.id])

  async function toggleResource(resource) {
    const resourceId = resource._id || resource.id
    const status = resource.status === 'active' ? 'paused' : 'active'
    setUpdatingResource(resourceId)
    setErrors((current) => current.filter((item) => item.label !== `Listing ${resource.title}`))
    try {
      const { data } = await api.patch(`/resources/${resourceId}/status`, { status })
      setResources((current) => current.map((item) => (item._id || item.id) === resourceId ? { ...item, status: data.data.status } : item))
    } catch (error) {
      setErrors((current) => [...current, { label: `Listing ${resource.title}`, message: getApiErrorMessage(error) }])
    } finally {
      setUpdatingResource('')
    }
  }

  const activeBookings = bookings.filter((booking) => !['completed', 'cancelled', 'rejected'].includes(booking.status))

  return (
    <section className="mx-auto min-h-[70vh] max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-green-700">Your ShareGrid</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">Welcome, {user.name?.split(' ')[0] || 'back'}.</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Your rentals, listings, and account updates in one place.</p>
        </div>
        <Link className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800" to="/list-resource"><Plus aria-hidden="true" size={17} />List a resource</Link>
      </div>

      {errors.length > 0 && (
        <div className="mt-7 space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="status">
          {errors.map(({ label, message }) => <p key={`${label}:${message}`}><strong>{label}:</strong> {message}</p>)}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Active bookings', value: activeBookings.length, Icon: CalendarDays, to: '/bookings' },
          { label: 'Your listings', value: resources.length, Icon: Boxes, to: '/list-resource' },
          { label: 'Verification reviews', value: verifications.length, Icon: ShieldCheck, to: '/list-resource' },
          { label: 'Organisations', value: organisations.length, Icon: Building2, to: '/organisations' },
          { label: 'Unread updates', value: unreadCount, Icon: Bell, to: '/notifications' },
        ].map(({ label, value, Icon, to }) => (
          <Link className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-400" key={label} to={to}>
            <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-slate-600">{label}</span><Icon aria-hidden="true" className="text-green-700" size={19} /></div>
            <p className="mt-4 text-3xl font-bold text-slate-950">{isLoading ? '…' : value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <div className="flex items-center justify-between gap-3 border-b border-slate-300 pb-4">
            <div><p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-600">Your activity</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Recent bookings</h2></div>
            <Link className="inline-flex items-center gap-1 text-sm font-semibold text-slate-800 hover:underline" to="/bookings">All bookings <ArrowRight aria-hidden="true" size={15} /></Link>
          </div>
          {isLoading ? <p className="py-8 text-sm text-slate-500">Loading your bookings…</p> : activeBookings.length ? (
            <ul className="divide-y divide-slate-200">
              {activeBookings.slice(0, 4).map((booking) => <li className="flex items-center justify-between gap-4 py-4" key={booking._id || booking.id}>
                <div className="min-w-0"><p className="truncate font-semibold text-slate-950">{booking.resource?.title || 'Resource booking'}</p><p className="mt-1 text-xs text-slate-500">{new Date(booking.start).toLocaleDateString()} – {new Date(booking.end).toLocaleDateString()}</p></div>
                <Link className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold capitalize text-slate-800 hover:bg-slate-200" to={`/bookings/${booking._id || booking.id}`}>{booking.status?.replaceAll('_', ' ') || 'Details'}</Link>
              </li>)}
            </ul>
          ) : <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No active bookings. <Link className="font-semibold text-slate-950 underline" to="/resources">Explore resources</Link></div>}
        </section>

        <section>
          <div className="flex items-center justify-between gap-3 border-b border-slate-300 pb-4">
            <div><p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-600">What you share</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Your listings</h2></div>
            <Link className="inline-flex items-center gap-1 text-sm font-semibold text-slate-800 hover:underline" to="/list-resource">Add listing <ArrowRight aria-hidden="true" size={15} /></Link>
          </div>
          {isLoading ? <p className="py-8 text-sm text-slate-500">Loading your listings…</p> : resources.length ? (
            <ul className="divide-y divide-slate-200">
              {resources.slice(0, 5).map((resource) => {
                const id = resource._id || resource.id
                return <li className="flex items-center justify-between gap-4 py-4" key={id}>
                  <div className="min-w-0"><Link className="truncate font-semibold text-slate-950 hover:underline" to={`/resources/${id}`}>{resource.title}</Link><p className="mt-1 text-xs capitalize text-slate-500">{resource.status?.replaceAll('_', ' ')} · {resource.verificationStatus?.replaceAll('_', ' ')}</p></div>
                  {['active', 'paused'].includes(resource.status) && <button className="shrink-0 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50" disabled={updatingResource === id} onClick={() => toggleResource(resource)} type="button">{updatingResource === id ? 'Saving…' : resource.status === 'active' ? 'Pause' : 'Activate'}</button>}
                </li>
              })}
            </ul>
          ) : <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">You haven’t listed a resource yet.</div>}
        </section>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { title: 'Profile & reputation', text: `Honor Score ${user.honorScore ?? '—'}${user.averageRating ? ` · ${Number(user.averageRating).toFixed(1)} rating` : ''}`, Icon: HeartHandshake, to: '/profile' },
          { title: 'Verification', text: verifications.length ? `${verifications.length} application(s) in your account` : 'Ownership applications are tracked here.', Icon: ClipboardCheck, to: '/list-resource' },
          { title: 'Organisations', text: organisations.length ? `${organisations.length} membership(s) and verification status` : 'Create or join an organisation.', Icon: Building2, to: '/organisations' },
          { title: 'Notifications', text: `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}`, Icon: Bell, to: '/notifications' },
        ].map(({ title, text, Icon, to }) => <Link className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-400" key={title} to={to}><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-800"><Icon aria-hidden="true" size={19} /></span><span><span className="block font-semibold text-slate-950">{title}</span><span className="mt-1 block text-sm leading-6 text-slate-600">{text}</span></span></Link>)}
      </div>
    </section>
  )
}

export default DashboardPage
