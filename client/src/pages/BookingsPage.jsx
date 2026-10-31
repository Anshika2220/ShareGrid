import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarClock, LoaderCircle, MessageSquareText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, getApiErrorMessage } from '../services/api.js'

const filters = ['all', 'requested', 'active', 'past']

function BookingsPage() {
  const [bookings, setBookings] = useState([])
  const [filter, setFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    api.get('/bookings/mine', { signal: controller.signal })
      .then(({ data }) => setBookings(data.data.items))
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(requestError))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [])

  const visibleBookings = useMemo(() => bookings.filter((booking) => {
    if (filter === 'requested') return booking.status === 'requested'
    if (filter === 'active') return ['approved', 'confirmed', 'checked_out', 'returned'].includes(booking.status)
    if (filter === 'past') return ['completed', 'cancelled', 'rejected'].includes(booking.status)
    return true
  }), [bookings, filter])

  return (
    <section className="mx-auto min-h-[70vh] max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-black" to="/dashboard"><ArrowLeft aria-hidden="true" size={16} />My ShareGrid</Link>
      <div className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Your activity</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">Bookings</h1><p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Track rentals you request and requests for resources you share.</p></div>
        <div className="flex flex-wrap gap-3"><Link className="inline-flex items-center gap-2 rounded-full border border-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100" to="/conversations"><MessageSquareText aria-hidden="true" size={16} />Negotiations</Link><Link className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800" to="/resources">Find a resource <ArrowRight aria-hidden="true" size={16} /></Link></div>
      </div>

      <nav aria-label="Filter bookings" className="mt-8 flex flex-wrap gap-2">
        {filters.map((value) => <button aria-pressed={filter === value} className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${filter === value ? 'bg-slate-950 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`} key={value} onClick={() => setFilter(value)} type="button">{value}</button>)}
      </nav>

      {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}<button className="ml-3 font-semibold underline" onClick={() => window.location.reload()} type="button">Reload</button></div>}
      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {isLoading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle aria-hidden="true" className="animate-spin" size={17} />Loading bookings…</div> : visibleBookings.length ? (
          <ul className="divide-y divide-slate-200">
            {visibleBookings.map((booking) => {
              const id = booking._id || booking.id
              const resource = booking.resource
              return <li key={id}><Link className="flex flex-wrap items-center gap-4 p-5 transition hover:bg-slate-50 sm:p-6" to={`/bookings/${id}`}>
                {resource?.images?.[0] ? <img alt="" className="size-16 rounded-xl object-cover" src={resource.images[0]} /> : <span className="grid size-16 place-items-center rounded-xl bg-slate-100 text-slate-700"><CalendarClock aria-hidden="true" size={23} /></span>}
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-slate-950">{resource?.title || 'Resource booking'}</span><span className="mt-1 block text-sm text-slate-600">{new Date(booking.start).toLocaleString()} – {new Date(booking.end).toLocaleString()}</span><span className="mt-1 block text-xs text-slate-500">{booking.seeker?.name ? `Renter: ${booking.seeker.name}` : ''}{booking.provider?.name ? ` · Provider: ${booking.provider.name}` : ''}</span></span>
                <span className="flex items-center gap-3"><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold capitalize text-slate-700">{booking.status?.replaceAll('_', ' ')}</span><ArrowRight aria-hidden="true" className="text-slate-500" size={17} /></span>
              </Link></li>
            })}
          </ul>
        ) : !error ? <div className="px-6 py-14 text-center"><CalendarClock aria-hidden="true" className="mx-auto text-slate-400" size={29} /><h2 className="mt-4 text-xl font-semibold text-slate-950">{bookings.length ? 'No bookings in this view' : 'No bookings yet'}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{bookings.length ? 'Choose another filter to see more of your activity.' : 'Your booking requests and rentals will appear here.'}</p>{!bookings.length && <Link className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800" to="/resources">Explore resources <ArrowRight aria-hidden="true" size={16} /></Link>}</div> : null}
      </section>
    </section>
  )
}

export default BookingsPage
