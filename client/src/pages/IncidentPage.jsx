import { useState } from 'react'
import { ArrowLeft, FileUp, ShieldAlert } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import IntegrationNotice from '../components/common/IntegrationNotice.jsx'

const incidentCategories = [
  'Damage',
  'Missing accessory',
  'Late return',
  'Non-return',
  'Misrepresentation',
  'Deposit dispute',
  'Payment issue',
  'Misconduct',
  'Other',
]

function IncidentPage() {
  const { bookingId } = useParams()
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  function updateFiles(fileList) {
    const incoming = Array.from(fileList)
    const accepted = incoming.filter((file) => file.size <= 20 * 1024 * 1024)
    setFiles(accepted)
    setError(incoming.length !== accepted.length ? 'Evidence files must be 20 MB or smaller.' : '')
  }

  function submit(event) {
    event.preventDefault()
    if (!category || !description.trim()) {
      setError('Choose an incident type and provide a description.')
      return
    }

    setError('')
    setNotice('This report has not been submitted. It remains in this page only until incident APIs are available.')
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
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Transaction support</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">
          Report an incident
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Booking reference <code className="font-mono text-slate-900">{bookingId}</code>
        </p>
      </div>

      <div className="mt-7">
        <IntegrationNotice>
          The booking hasn’t been verified and this report won’t be sent or stored. Incident status,
          evidence handling, and decisions must come from the backend.
        </IntegrationNotice>
      </div>

      <form className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8" onSubmit={submit}>
        <div>
          <label className="text-sm font-semibold text-slate-800" htmlFor="incidentCategory">
            What happened? <span className="text-red-700">*</span>
          </label>
          <select
            className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-black focus:ring-4 focus:ring-slate-100"
            id="incidentCategory"
            onChange={(event) => {
              setCategory(event.target.value)
              setError('')
              setNotice('')
            }}
            value={category}
          >
            <option value="">Select an incident type</option>
            {incidentCategories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        <div className="mt-5">
          <label className="text-sm font-semibold text-slate-800" htmlFor="incidentDescription">
            Describe the issue <span className="text-red-700">*</span>
          </label>
          <textarea
            className="mt-2 block min-h-36 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-black focus:ring-4 focus:ring-slate-100"
            id="incidentDescription"
            maxLength={3000}
            onChange={(event) => {
              setDescription(event.target.value)
              setError('')
              setNotice('')
            }}
            placeholder="Include relevant details and when the issue occurred."
            value={description}
          />
          <p className="mt-1 text-right text-xs text-slate-500">{description.length}/3000</p>
        </div>

        <div className="mt-5">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800" htmlFor="incidentEvidence">
            <FileUp aria-hidden="true" size={17} />
            Supporting evidence
          </label>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Optional. Files stay local and aren’t uploaded. Maximum 20 MB per file.
          </p>
          <input
            className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-800"
            id="incidentEvidence"
            multiple
            onChange={(event) => updateFiles(event.target.files ?? [])}
            type="file"
          />
          {files.length > 0 && <p className="mt-2 text-xs text-slate-600">{files.length} local file(s) selected</p>}
        </div>

        {(error || notice) && (
          <p aria-live="polite" className={`mt-5 rounded-lg px-4 py-3 text-sm leading-6 ${error ? 'bg-red-50 text-red-900' : 'bg-slate-100 text-slate-800'}`}>
            {error || notice}
          </p>
        )}

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          <ShieldAlert aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
          <p>Share facts and evidence. Only authorised reviewers can resolve incidents or make deposit and reputation decisions.</p>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
          <Link className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100" to={`/bookings/${bookingId}`}>
            Cancel
          </Link>
          <button
            className="inline-flex cursor-not-allowed items-center rounded-full bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500"
            disabled
            title="Incident submission will be enabled when backend incident and evidence endpoints are available."
            type="submit"
          >
            Submit unavailable
          </button>
        </div>
      </form>
    </section>
  )
}

export default IncidentPage
