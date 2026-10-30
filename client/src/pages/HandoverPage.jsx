import { useState } from 'react'
import {
  ArrowLeft,
  Camera,
  Check,
  CircleAlert,
  ClipboardCheck,
  ShieldCheck,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import IntegrationNotice from '../components/common/IntegrationNotice.jsx'

const stages = {
  checkin: {
    label: 'Check-in',
    heading: 'Record handover condition',
    description: 'Document the resource condition and included items before the rental begins.',
  },
  checkout: {
    label: 'Check-out',
    heading: 'Record return condition',
    description: 'Document the resource and included items when the rental is returned.',
  },
}

function HandoverPage() {
  const { bookingId } = useParams()
  const [stage, setStage] = useState('checkin')
  const [drafts, setDrafts] = useState({})
  const [message, setMessage] = useState('')
  const currentStage = stages[stage]
  const currentDraft = drafts[stage] ?? { notes: '', acknowledged: false, photos: [] }

  function updateDraft(field, value) {
    setDrafts((current) => ({
      ...current,
      [stage]: { ...currentDraft, [field]: value },
    }))
  }

  function choosePhotos(fileList) {
    const incoming = Array.from(fileList)
    const valid = incoming.filter((file) => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024)
    const remaining = 10 - currentDraft.photos.length
    updateDraft('photos', [...currentDraft.photos, ...valid.slice(0, remaining)])
    setMessage(
      valid.length < incoming.length || valid.length > remaining
        ? 'Use image files up to 10 MB. You can add up to 10 photos per handover stage.'
        : '',
    )
  }

  function submitDraft(event) {
    event.preventDefault()
    setMessage('This check-in/out has not been submitted. Booking access and the handover API are not connected.')
  }

  return (
    <section className="mx-auto min-h-[70vh] max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-black"
        to={`/bookings/${bookingId}`}
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Booking details
      </Link>

      <div className="mt-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Handover record</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">
          Check-in & return
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Booking reference <code className="font-mono text-slate-900">{bookingId}</code>
        </p>
      </div>

      <div className="mt-7">
        <IntegrationNotice>
          Booking access, participant permissions, checklist items, timestamps, and handover
          submission must be confirmed by the backend. This form is a local draft only.
        </IntegrationNotice>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <form className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7" onSubmit={submitDraft}>
          <div aria-label="Choose handover stage" className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            {Object.entries(stages).map(([key, value]) => (
              <button
                aria-pressed={stage === key}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  stage === key ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-950'
                }`}
                key={key}
                onClick={() => {
                  setStage(key)
                  setMessage('')
                }}
                type="button"
              >
                {value.label}
              </button>
            ))}
          </div>

          <h2 className="mt-7 text-xl font-semibold text-slate-950">{currentStage.heading}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{currentStage.description}</p>

          <div className="mt-6">
            <label className="text-sm font-semibold text-slate-800" htmlFor="conditionNotes">
              Condition notes
            </label>
            <textarea
              className="mt-2 block min-h-32 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-black focus:ring-4 focus:ring-slate-100"
              id="conditionNotes"
              onChange={(event) => {
                updateDraft('notes', event.target.value)
                setMessage('')
              }}
              placeholder="Note any visible condition details or observations."
              value={currentDraft.notes}
            />
          </div>

          <div className="mt-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800" htmlFor="conditionPhotos">
              <Camera aria-hidden="true" size={17} />
              Condition photographs
            </label>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Optional local previews only. Photos are not uploaded or saved.
            </p>
            <input
              accept="image/*"
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-800"
              id="conditionPhotos"
              key={stage}
              multiple
              onChange={(event) => choosePhotos(event.target.files ?? [])}
              type="file"
            />
            {currentDraft.photos.length > 0 && (
              <p className="mt-2 text-xs text-slate-600">
                {currentDraft.photos.length} local photo{currentDraft.photos.length === 1 ? '' : 's'} selected
              </p>
            )}
          </div>

          <label className="mt-6 flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            <input
              checked={currentDraft.acknowledged}
              className="mt-1 accent-green-700"
              onChange={(event) => {
                updateDraft('acknowledged', event.target.checked)
                setMessage('')
              }}
              type="checkbox"
            />
            <span>I’ve reviewed the condition details in this local draft.</span>
          </label>

          {message && (
            <p aria-live="polite" className="mt-4 rounded-lg bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-800">
              {message}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
            <span className="text-xs text-slate-500">Submission is unavailable</span>
            <button
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500"
              disabled
              title="Submit is disabled until booking permissions and the handover API are available."
              type="submit"
            >
              <Check aria-hidden="true" size={16} />
              Confirm {currentStage.label.toLowerCase()}
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <ClipboardCheck aria-hidden="true" className="text-green-700" size={19} />
              <h2 className="font-semibold text-slate-950">Transaction record</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The real booking timeline, approved checklist, and recorded photos will appear after the backend confirms access.
            </p>
            <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
              No handover timestamp recorded
            </p>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-green-50 p-5">
            <div className="flex items-center gap-2 text-green-800">
              <ShieldCheck aria-hidden="true" size={18} />
              <h2 className="text-sm font-semibold">Keep both sides informed</h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-green-900">
              Record condition together and report damage through the transaction when those actions are enabled.
            </p>
          </section>
          <Link className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50" to={`/bookings/${bookingId}/incident`}>
            <CircleAlert aria-hidden="true" size={19} />
            Report an incident
          </Link>
        </aside>
      </div>
    </section>
  )
}

export default HandoverPage
