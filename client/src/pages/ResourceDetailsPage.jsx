import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, CircleAlert, LoaderCircle, MapPin, MessageSquareText, ShieldCheck, Star } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { api, getApiErrorMessage } from '../services/api.js'

function ResourceDetailsPage() {
  const { resourceId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [resource, setResource] = useState(null)
  const [reviews, setReviews] = useState([])
  const [availability, setAvailability] = useState(null)
  const [dates, setDates] = useState({ start: '', end: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [isBooking, setIsBooking] = useState(false)
  const [isContacting, setIsContacting] = useState(false)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setError('')
    api.get(`/resources/${resourceId}`, { signal: controller.signal })
      .then(({ data }) => setResource(data.data.resource))
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(requestError))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    api.get(`/resources/${resourceId}/availability`, { signal: controller.signal })
      .then(({ data }) => setAvailability(data.data))
      .catch((requestError) => {
        if (!controller.signal.aborted) setActionMessage(getApiErrorMessage(requestError))
      })
    api.get(`/resources/${resourceId}/reviews`, { signal: controller.signal })
      .then(({ data }) => setReviews(data.data.items))
      .catch((requestError) => {
        if (!controller.signal.aborted) setActionMessage(getApiErrorMessage(requestError))
      })
    return () => controller.abort()
  }, [resourceId])

  async function requestBooking(event) {
    event.preventDefault()
    setActionMessage('')
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/resources/${resourceId}` } } })
      return
    }
    if (!dates.start || !dates.end) {
      setActionMessage('Choose both a start and end date.')
      return
    }

    setIsBooking(true)
    try {
      const start = new Date(dates.start).toISOString()
      const end = new Date(dates.end).toISOString()
      const eligibility = await api.get(`/bookings/eligibility/${resourceId}`, { params: { start, end } })
      if (!eligibility.data.data.eligible) {
        setActionMessage(eligibility.data.data.reason || 'This date range is not currently eligible.')
        return
      }
      const { data } = await api.post('/bookings', { resourceId, start, end })
      const booking = data.data.booking
      navigate(`/bookings/${booking._id || booking.id}`)
    } catch (requestError) {
      setActionMessage(getApiErrorMessage(requestError))
    } finally {
      setIsBooking(false)
    }
  }

  async function startConversation() {
    setActionMessage('')
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/resources/${resourceId}` } } })
      return
    }
    setIsContacting(true)
    try {
      const { data } = await api.post('/conversations', { resourceId })
      const conversation = data.data.conversation
      navigate(`/conversations/${conversation._id || conversation.id}`)
    } catch (requestError) {
      setActionMessage(getApiErrorMessage(requestError))
    } finally {
      setIsContacting(false)
    }
  }

  if (isLoading) {
    return <div className="mx-auto grid min-h-[60vh] max-w-7xl place-items-center px-5 text-sm text-slate-600"><LoaderCircle aria-hidden="true" className="animate-spin" />Loading resource…</div>
  }

  if (error || !resource) {
    return (
      <section className="mx-auto min-h-[60vh] max-w-4xl px-5 py-12 sm:px-8">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600" to="/resources"><ArrowLeft aria-hidden="true" size={16} />Back to resources</Link>
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">{error || 'Resource not found.'}</div>
      </section>
    )
  }

  const permittedRange = resource.permittedPriceRange
  const city = resource.location?.city || resource.city
  const price = Number(resource.price).toLocaleString('en-IN')

  return (
    <section className="mx-auto min-h-[65vh] max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700" to="/resources"><ArrowLeft aria-hidden="true" size={16} />Back to resources</Link>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            {resource.images?.slice(0, 4).map((image, index) => (
              <img alt={`${resource.title} photo ${index + 1}`} className={`aspect-[4/3] w-full rounded-2xl bg-slate-100 object-cover ${index === 0 ? 'sm:col-span-2 sm:aspect-[16/8]' : ''}`} key={`${image}-${index}`} src={image} />
            ))}
            {!resource.images?.length && <div className="grid aspect-[16/8] place-items-center rounded-2xl bg-slate-100 text-slate-500">No photos provided</div>}
          </div>

          <div className="mt-7 flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-green-700">{resource.category}</p>
              <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-4xl">{resource.title}</h1>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><MapPin aria-hidden="true" size={16} />{[city, resource.location?.state].filter(Boolean).join(', ') || 'Location not provided'}</p>
            </div>
            {resource.verificationStatus === 'approved' && <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-800"><ShieldCheck aria-hidden="true" size={15} />Ownership verified</span>}
          </div>

          <div className="mt-8 grid gap-4 border-y border-slate-200 py-6 sm:grid-cols-3">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Brand & model</p><p className="mt-1 font-semibold text-slate-950">{[resource.brand, resource.model].filter(Boolean).join(' ')}</p></div>
            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Condition</p><p className="mt-1 font-semibold capitalize text-slate-950">{resource.condition?.replaceAll('_', ' ')}</p></div>
            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rating</p><p className="mt-1 inline-flex items-center gap-1 font-semibold text-slate-950"><Star aria-hidden="true" className="text-green-700" fill="currentColor" size={15} />{resource.averageRating ? Number(resource.averageRating).toFixed(1) : 'New'}{resource.ratingCount ? ` (${resource.ratingCount})` : ''}</p></div>
          </div>

          <section className="mt-7">
            <h2 className="text-xl font-semibold text-slate-950">About this resource</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{resource.description}</p>
            {resource.accessories?.length > 0 && <p className="mt-4 text-sm text-slate-700"><strong>Included:</strong> {resource.accessories.join(', ')}</p>}
            {resource.usageInstructions && <p className="mt-4 text-sm leading-6 text-slate-700"><strong>Usage:</strong> {resource.usageInstructions}</p>}
          </section>

          <section className="mt-9 border-t border-slate-200 pt-7">
            <h2 className="text-xl font-semibold text-slate-950">Reviews</h2>
            {reviews.length ? <ul className="mt-4 divide-y divide-slate-200">{reviews.map((review) => <li className="py-4" key={review._id || review.id}><p className="flex items-center gap-1 text-sm font-semibold text-slate-900"><Star aria-hidden="true" className="text-green-700" fill="currentColor" size={15} />{review.rating}/5 <span className="font-normal text-slate-500">by {review.reviewer?.name || 'ShareGrid member'}</span></p><p className="mt-2 text-sm leading-6 text-slate-700">{review.text}</p></li>)}</ul> : <p className="mt-3 text-sm text-slate-600">No published reviews yet.</p>}
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6">
          <p className="text-2xl font-bold text-slate-950">₹{price}<span className="text-sm font-normal text-slate-500"> / {resource.pricingUnit === 'hourly' ? 'hour' : 'day'}</span></p>
          {permittedRange && <p className="mt-1 text-xs text-slate-500">Permitted offer range: ₹{Number(permittedRange.minimum).toLocaleString('en-IN')}–₹{Number(permittedRange.maximum).toLocaleString('en-IN')}</p>}
          {resource.deposit?.required && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">Refundable deposit: ₹{Number(resource.deposit.amount).toLocaleString('en-IN')}</p>}

          <form className="mt-5 space-y-3" onSubmit={requestBooking}>
            <label className="block text-xs font-semibold text-slate-700" htmlFor="bookingStart">Start date & time</label>
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" id="bookingStart" onChange={(event) => setDates((current) => ({ ...current, start: event.target.value }))} type="datetime-local" value={dates.start} />
            <label className="block text-xs font-semibold text-slate-700" htmlFor="bookingEnd">End date & time</label>
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" id="bookingEnd" onChange={(event) => setDates((current) => ({ ...current, end: event.target.value }))} type="datetime-local" value={dates.end} />
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60" disabled={isBooking} type="submit">
              <CalendarDays aria-hidden="true" size={16} />{isBooking ? 'Checking availability…' : 'Request booking'}
            </button>
          </form>
          <button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60" disabled={isContacting} onClick={startConversation} type="button">
            <MessageSquareText aria-hidden="true" size={16} />{isContacting ? 'Opening conversation…' : 'Message the owner'}
          </button>
          {availability && <p className="mt-4 text-xs leading-5 text-slate-500">{availability.occupied?.length ? 'Availability is checked against existing reservations.' : 'No existing reservations are reported for this listing.'}</p>}
          {actionMessage && <p aria-live="polite" className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-950"><CircleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={15} />{actionMessage}</p>}
          {!user && <p className="mt-4 text-center text-xs text-slate-500">You’ll be asked to log in before requesting a booking.</p>}
        </aside>
      </div>
    </section>
  )
}

export default ResourceDetailsPage
