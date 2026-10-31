import { useEffect, useState } from 'react'
import { ArrowLeft, FileUp, LoaderCircle, ShieldAlert } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { api, getApiErrorMessage } from '../services/api.js'

const incidentTypes = [
  ['damage', 'Damage'],
  ['missing_accessories', 'Missing accessories'],
  ['late_return', 'Late return'],
  ['non_return', 'Non-return'],
  ['misrepresentation', 'Misrepresentation'],
  ['payment_dispute', 'Payment dispute'],
  ['deposit_dispute', 'Deposit dispute'],
  ['behaviour', 'Behaviour'],
  ['other', 'Other'],
]

function IncidentPage() {
  const { bookingId } = useParams()
  const [booking, setBooking] = useState(null)
  const [type, setType] = useState('')
  const [description, setDescription] = useState('')
  const [evidenceText, setEvidenceText] = useState('')
  const [incident, setIncident] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

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

  async function submit(event) {
    event.preventDefault()
    setError('')
    const evidence = evidenceText.split(/[\n,]/).map((value) => value.trim()).filter(Boolean)
    if (evidence.length > 20 || evidence.some((value) => {
      try {
        return !['http:', 'https:'].includes(new URL(value).protocol)
      } catch {
        return true
      }
    })) {
      setError('Enter up to 20 valid HTTP or HTTPS evidence links, one per line.')
      return
    }

    setIsSubmitting(true)
    try {
      const { data } = await api.post('/incidents', {
        bookingId,
        type,
        description: description.trim(),
        evidence,
      })
      setIncident(data.data.incident)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (incident) {
    const incidentId = incident._id || incident.id
    return (
      <section className="mx-auto min-h-[65vh] max-w-3xl px-5 py-12 sm:px-8 sm:py-20">
        <div className="rounded-2xl border border-green-200 bg-white p-6 sm:p-8">
          <span className="grid size-12 place-items-center rounded-xl bg-green-50 text-green-800"><ShieldAlert aria-hidden="true" size={23} /></span>
          <h1 className="mt-5 text-2xl font-semibold text-slate-950">Incident report submitted</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Your report is recorded and will be reviewed by an authorised team member. No automatic penalty or deposit decision is made.</p>
          <p className="mt-4 text-sm text-slate-700">Report <code className="font-mono">{incidentId}</code> · <span className="capitalize">{incident.status?.replaceAll('_', ' ') || 'submitted'}</span></p>
          <div className="mt-6 flex flex-wrap gap-3"><Link className="rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white" to={`/incidents/${incidentId}`}>View report</Link><Link className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-800" to={`/bookings/${bookingId}`}>Back to booking</Link></div>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto min-h-[70vh] max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-black" to={`/bookings/${bookingId}`}><ArrowLeft aria-hidden="true" size={16} />Booking details</Link>
      <div className="mt-8"><p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Transaction support</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">Report an incident</h1></div>
      {isLoading ? <div className="mt-6 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle aria-hidden="true" className="animate-spin" size={17} />Verifying booking…</div> : booking && <p className="mt-6 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">Booking <strong>{booking.resource?.title || bookingId}</strong> · <span className="capitalize">{booking.status?.replaceAll('_', ' ')}</span></p>}
      {error && <p aria-live="polite" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</p>}

      <form className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8" onSubmit={submit}>
        <div>
          <label className="text-sm font-semibold text-slate-800" htmlFor="incidentType">Incident type <span className="text-red-700">*</span></label>
          <select className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-black focus:outline-none" id="incidentType" onChange={(event) => setType(event.target.value)} required value={type}>
            <option value="">Select an incident type</option>{incidentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="mt-5">
          <label className="text-sm font-semibold text-slate-800" htmlFor="incidentDescription">Describe what happened <span className="text-red-700">*</span></label>
          <textarea className="mt-2 block min-h-36 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-900 focus:border-black focus:outline-none focus:ring-4 focus:ring-slate-100" id="incidentDescription" maxLength={5000} minLength={10} onChange={(event) => setDescription(event.target.value)} required value={description} />
          <p className="mt-1 text-right text-xs text-slate-500">{description.length}/5000</p>
        </div>
        <div className="mt-5">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800" htmlFor="evidence"><FileUp aria-hidden="true" size={17} />Evidence links <span className="font-normal text-slate-500">(optional)</span></label>
          <p className="mt-1 text-xs leading-5 text-slate-500">Add up to 20 HTTP or HTTPS URLs, one per line. The backend accepts links; it does not upload local files.</p>
          <textarea className="mt-2 block min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-black focus:outline-none" id="evidence" onChange={(event) => setEvidenceText(event.target.value)} placeholder="https://…" value={evidenceText} />
        </div>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700"><ShieldAlert aria-hidden="true" className="mt-0.5 shrink-0" size={18} /><p>Share facts and evidence. Only authorised reviewers can resolve incidents or make deposit and reputation decisions.</p></div>
        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
          <Link className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100" to={`/bookings/${bookingId}`}>Cancel</Link>
          <button className="inline-flex items-center rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-50" disabled={isLoading || isSubmitting || !booking} type="submit">{isSubmitting ? 'Submitting…' : 'Submit report'}</button>
        </div>
      </form>
    </section>
  )
}

export default IncidentPage
