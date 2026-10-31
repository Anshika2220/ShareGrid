import { useState } from 'react'
import { ArrowLeft, Star } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import IntegrationNotice from '../components/common/IntegrationNotice.jsx'

const reviewLimit = 50

function countWords(value) {
  return value.trim().match(/\S+/g)?.length ?? 0
}

function ReviewPage() {
  const { bookingId } = useParams()
  const [rating, setRating] = useState('')
  const [review, setReview] = useState('')
  const [error, setError] = useState('')
  const words = countWords(review)
  const overLimit = words > reviewLimit

  function updateReview(value) {
    setReview(value)
    setError('')
  }

  function submit(event) {
    event.preventDefault()
    if (!rating || !review.trim()) {
      setError('Select a rating and write a review to continue.')
      return
    }
    if (overLimit) {
      setError(`Reviews must be ${reviewLimit} words or fewer.`)
      return
    }
    setError('This review has not been submitted. The booking must be verified as completed and review APIs are not connected.')
  }

  return (
    <section className="mx-auto min-h-[70vh] max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-black"
        to={`/bookings/${bookingId}`}
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Booking details
      </Link>

      <div className="mt-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Share your experience</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">
          Review a transaction
        </h1>
      </div>

      <div className="mt-7">
        <IntegrationNotice>
          Reviews are only available after the backend confirms a completed transaction and that
          you’re eligible to review it. This draft won’t be published or saved.
        </IntegrationNotice>
      </div>

      <form className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8" onSubmit={submit}>
        <fieldset>
          <legend className="text-sm font-semibold text-slate-800">Your rating</legend>
          <div aria-label="Choose a rating" className="mt-3 flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                aria-label={`${value} star${value === 1 ? '' : 's'}`}
                aria-pressed={rating === String(value)}
                className={`grid size-11 place-items-center rounded-lg border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                  rating && value <= Number(rating)
                    ? 'border-green-700 bg-green-50 text-green-700'
                    : 'border-slate-300 bg-white text-slate-400 hover:border-slate-500'
                }`}
                key={value}
                onClick={() => {
                  setRating(String(value))
                  setError('')
                }}
                type="button"
              >
                <Star aria-hidden="true" fill={rating && value <= Number(rating) ? 'currentColor' : 'none'} size={19} />
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-6">
          <label className="text-sm font-semibold text-slate-800" htmlFor="review">
            Written review <span className="text-red-700">*</span>
          </label>
          <textarea
            aria-describedby="review-word-count"
            aria-invalid={overLimit}
            className={`mt-2 block min-h-36 w-full resize-y rounded-xl border bg-white px-4 py-3 text-sm leading-6 outline-none focus:ring-4 ${
              overLimit
                ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                : 'border-slate-300 focus:border-black focus:ring-slate-100'
            }`}
            id="review"
            onChange={(event) => updateReview(event.target.value)}
            placeholder="Describe the resource or transaction experience."
            value={review}
          />
          <p
            className={`mt-1 text-right text-xs ${overLimit ? 'font-semibold text-red-700' : 'text-slate-500'}`}
            id="review-word-count"
            aria-live="polite"
          >
            {words}/{reviewLimit} words
          </p>
        </div>

        {(error || overLimit) && (
          <p aria-live="polite" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-900">
            {error || `Reviews must be ${reviewLimit} words or fewer.`}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <p className="text-xs leading-5 text-slate-500">One review per party, after transaction completion.</p>
          <button
            className="inline-flex cursor-not-allowed items-center rounded-full bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500"
            disabled
            title="Review submission requires a completed booking confirmed by the backend."
            type="submit"
          >
            Submit unavailable
          </button>
        </div>
      </form>
    </section>
  )
}

export default ReviewPage
