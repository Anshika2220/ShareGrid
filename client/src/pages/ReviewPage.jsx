import { useEffect, useState } from 'react'
import { ArrowLeft, LoaderCircle, Star } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { api, getApiErrorMessage } from '../services/api.js'

const reviewLimit = 50

function countWords(value) {
  return value.trim().match(/\S+/g)?.length ?? 0
}

function ReviewPage() {
  const { bookingId } = useParams()
  const [booking, setBooking] = useState(null)
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const words = countWords(text)
  const overLimit = words > reviewLimit

  useEffect(() => {
    const controller = new AbortController()
    api.get(`/bookings/${bookingId}`, { signal: controller.signal })
      .then(({ data }) => setBooking(data.data.booking))
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(requestError))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [bookingId])

  async function submitReview(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!rating || !text.trim()) {
      setError('Choose a rating and write a review to continue.')
      return
    }
    if (overLimit) {
      setError(`Reviews must be ${reviewLimit} words or fewer.`)
      return
    }

    setIsSubmitting(true)
    try {
      const { data } = await api.post('/reviews', { bookingId, rating, text: text.trim() })
      setSuccess(data.message || 'Your review has been published.')
      setText('')
      setRating(0)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto min-h-[70vh] max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-black" to={`/bookings/${bookingId}`}><ArrowLeft aria-hidden="true" size={16} />Booking details</Link>
      <div className="mt-8"><p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Share your experience</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">Review a transaction</h1></div>

      {isLoading ? <div className="mt-8 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle aria-hidden="true" className="animate-spin" size={17} />Loading booking…</div> : booking && <p className="mt-6 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">Reviewing <strong>{booking.resource?.title || 'this resource'}</strong> · transaction status: <strong className="capitalize">{booking.status?.replaceAll('_', ' ')}</strong>. Reviews are accepted after completion.</p>}

      {error && <p aria-live="polite" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</p>}
      {success && <p aria-live="polite" className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-900">{success}</p>}

      <form className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8" onSubmit={submitReview}>
        <fieldset>
          <legend className="text-sm font-semibold text-slate-800">Your rating</legend>
          <div aria-label="Choose a rating" className="mt-3 flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => <button aria-label={`${value} star${value === 1 ? '' : 's'}`} aria-pressed={rating === value} className={`grid size-11 place-items-center rounded-lg border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${rating >= value ? 'border-green-700 bg-green-50 text-green-700' : 'border-slate-300 bg-white text-slate-400 hover:border-slate-500'}`} key={value} onClick={() => setRating(value)} type="button"><Star aria-hidden="true" fill={rating >= value ? 'currentColor' : 'none'} size={19} /></button>)}
          </div>
        </fieldset>
        <div className="mt-6">
          <label className="text-sm font-semibold text-slate-800" htmlFor="reviewText">Written review</label>
          <textarea aria-describedby="review-word-count" aria-invalid={overLimit} className={`mt-2 block min-h-36 w-full resize-y rounded-xl border bg-white px-4 py-3 text-sm leading-6 outline-none focus:ring-4 ${overLimit ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-300 focus:border-black focus:ring-slate-100'}`} id="reviewText" maxLength={1000} onChange={(event) => setText(event.target.value)} placeholder="Describe the resource or transaction experience." value={text} />
          <p aria-live="polite" className={`mt-1 text-right text-xs ${overLimit ? 'font-semibold text-red-700' : 'text-slate-500'}`} id="review-word-count">{words}/{reviewLimit} words</p>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <p className="text-xs leading-5 text-slate-500">One review per party, after transaction completion.</p>
          <button className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-50" disabled={isLoading || isSubmitting || overLimit || !booking} type="submit">{isSubmitting ? 'Publishing…' : 'Publish review'}</button>
        </div>
      </form>
    </section>
  )
}

export default ReviewPage
