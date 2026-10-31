import { useEffect, useState } from 'react'
import { ArrowLeft, LoaderCircle, ShieldAlert } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { api, getApiErrorMessage } from '../services/api.js'

function IncidentDetailsPage() {
  const { incidentId } = useParams()
  const [incident, setIncident] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAppealing, setIsAppealing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    api.get(`/incidents/${incidentId}`, { signal: controller.signal })
      .then(({ data }) => setIncident(data.data.incident))
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(requestError))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [incidentId])

  async function appeal() {
    const reason = window.prompt('Explain why you are appealing this decision:')
    if (!reason?.trim()) return
    setIsAppealing(true)
    setError('')
    setNotice('')
    try {
      const { data } = await api.post(`/incidents/${incidentId}/appeal`, { reason: reason.trim() })
      setIncident(data.data.incident)
      setNotice(data.message || 'Your appeal has been submitted for review.')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setIsAppealing(false)
    }
  }

  return (
    <section className="mx-auto min-h-[65vh] max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700" to="/dashboard"><ArrowLeft aria-hidden="true" size={16} />My ShareGrid</Link>
      <div className="mt-8 flex items-center gap-3"><span className="grid size-12 place-items-center rounded-xl bg-slate-100 text-slate-800"><ShieldAlert aria-hidden="true" size={23} /></span><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Transaction support</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Incident report</h1></div></div>
      {isLoading && <div className="mt-8 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle aria-hidden="true" className="animate-spin" size={17} />Loading incident…</div>}
      {error && <p aria-live="polite" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</p>}
      {notice && <p aria-live="polite" className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-900">{notice}</p>}
      {incident && <article className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold capitalize text-slate-950">{incident.type?.replaceAll('_', ' ')}</p><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold capitalize text-slate-700">{incident.status?.replaceAll('_', ' ')}</span></div>
        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{incident.description}</p>
        <p className="mt-4 text-xs text-slate-500">Reported {new Date(incident.createdAt).toLocaleString()} · booking <Link className="underline" to={`/bookings/${incident.booking?._id || incident.booking || incident.bookingId}`}>view transaction</Link></p>
        {incident.evidence?.length > 0 && <div className="mt-5"><h2 className="text-sm font-semibold text-slate-800">Evidence</h2><ul className="mt-2 space-y-1 text-sm">{incident.evidence.map((url) => <li key={url}><a className="break-all text-slate-700 underline" href={url} rel="noreferrer" target="_blank">{url}</a></li>)}</ul></div>}
        {['resolved', 'dismissed'].includes(incident.status) && !incident.appeal && <button className="mt-6 rounded-full border border-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-50" disabled={isAppealing} onClick={appeal} type="button">{isAppealing ? 'Submitting…' : 'Appeal this decision'}</button>}
        {incident.appeal && <p className="mt-5 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">Appeal status: <strong className="capitalize">{incident.appeal.status || 'submitted'}</strong></p>}
      </article>}
    </section>
  )
}

export default IncidentDetailsPage
