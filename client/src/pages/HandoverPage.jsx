import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Camera, Check, ClipboardCheck, LoaderCircle, PackageCheck, ShieldCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import CloudinaryImageUploader from '../components/CloudinaryImageUploader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api, getApiErrorMessage } from '../services/api.js'

const stages = {
  checkin: {
    label: 'Check-in',
    heading: 'Record handover condition',
    description: 'Document the resource condition and included items before the rental begins.',
    path: 'check-in',
  },
  checkout: {
    label: 'Check-out',
    heading: 'Record return condition',
    description: 'Document the resource condition and included items when the rental is returned.',
    path: 'check-out',
  },
}

function splitList(value) {
  return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)
}

function HandoverPage() {
  const { bookingId } = useParams()
  const { user } = useAuth()
  const [booking, setBooking] = useState(null)
  const [handover, setHandover] = useState(null)
  const [stage, setStage] = useState('checkin')
  const [condition, setCondition] = useState('')
  const [photos, setPhotos] = useState([])
  const [accessoriesText, setAccessoriesText] = useState('')
  const [missingItemsText, setMissingItemsText] = useState('')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadData = useCallback(async (signal) => {
    setIsLoading(true)
    setError('')
    try {
      const [bookingResponse, handoverResponse] = await Promise.all([
        api.get(`/bookings/${bookingId}`, { signal }),
        api.get(`/bookings/${bookingId}/handover`, { signal }),
      ])
      setBooking(bookingResponse.data.data.booking)
      setHandover(handoverResponse.data.data.handover)
    } catch (requestError) {
      if (!signal?.aborted) setError(getApiErrorMessage(requestError))
    } finally {
      if (!signal?.aborted) setIsLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    const controller = new AbortController()
    loadData(controller.signal)
    return () => controller.abort()
  }, [loadData])

  const idOf = (value) => value?._id || value?.id || value
  const isProvider = idOf(booking?.provider) === user.id
  const isSeeker = idOf(booking?.seeker) === user.id
  const record = handover?.[stage === 'checkin' ? 'checkIn' : 'checkOut']
  const currentUserConfirmed = isProvider ? Boolean(record?.providerConfirmedAt) : Boolean(record?.seekerConfirmedAt)
  const bothConfirmed = Boolean(record?.providerConfirmedAt && record?.seekerConfirmedAt)
  const canInitialCheckout = stage === 'checkout' && isSeeker && !record
  const canSubmitInitial = stage === 'checkin' ? !record : canInitialCheckout
  const canConfirm = Boolean(record && !currentUserConfirmed && (stage === 'checkin' || isProvider))
  const canAct = canSubmitInitial || canConfirm
  const stageInfo = stages[stage]
  const checkedIn = Boolean(handover?.checkIn?.providerConfirmedAt && handover?.checkIn?.seekerConfirmedAt)

  const actionLabel = useMemo(() => {
    if (!record) return `Submit ${stageInfo.label.toLowerCase()}`
    if (currentUserConfirmed) return 'Waiting for other participant'
    return `Confirm ${stageInfo.label.toLowerCase()}`
  }, [record, stageInfo.label, currentUserConfirmed])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    let body = { confirm: true }
    if (canSubmitInitial) {
      const accessories = splitList(accessoriesText)
      const missingItems = splitList(missingItemsText)
      if (condition.trim().length < 2) {
        setError('Describe the resource condition (at least 2 characters).')
        return
      }
      if (!photos.length || photos.length > 20) {
        setError('Upload between 1 and 20 condition photos.')
        return
      }
      if (accessories.length > 50 || missingItems.length > 50) {
        setError('Add no more than 50 items in each list.')
        return
      }
      body = {
        condition: condition.trim(),
        photos,
        accessories,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(stage === 'checkout' ? { missingItems } : {}),
      }
    }

    setIsSubmitting(true)
    try {
      const { data } = await api.post(`/bookings/${bookingId}/${stageInfo.path}`, body)
      setHandover(data.data.handover)
      setNotice(data.message || (canSubmitInitial ? `${stageInfo.label} details recorded.` : `${stageInfo.label} confirmed.`))
      setCondition('')
      setPhotos([])
      setAccessoriesText('')
      setMissingItemsText('')
      setNotes('')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="mx-auto grid min-h-[55vh] place-items-center text-sm text-slate-600"><LoaderCircle aria-hidden="true" className="animate-spin" />Loading transaction…</div>

  return (
    <section className="mx-auto min-h-[70vh] max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-black" to={`/bookings/${bookingId}`}><ArrowLeft aria-hidden="true" size={16} />Booking details</Link>
      <div className="mt-8"><p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Handover record</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">Check-in & return</h1><p className="mt-3 text-sm text-slate-600">{booking?.resource?.title || 'Resource booking'} · {booking?.status?.replaceAll('_', ' ')}</p></div>

      {error && <p aria-live="polite" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</p>}
      {notice && <p aria-live="polite" className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-900">{notice}</p>}

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <form className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7" onSubmit={submit}>
          <div aria-label="Choose handover stage" className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            {Object.entries(stages).map(([key, value]) => <button aria-pressed={stage === key} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${stage === key ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`} key={key} onClick={() => { setStage(key); setError(''); setNotice('') }} type="button">{value.label}</button>)}
          </div>

          <h2 className="mt-7 text-xl font-semibold text-slate-950">{stageInfo.heading}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{stageInfo.description}</p>

          {record && <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm">
            <p className="font-semibold text-slate-900">Recorded condition</p>
            <p className="mt-1 whitespace-pre-line text-slate-700">{record.condition}</p>
            <p className="mt-3 text-xs text-slate-500">Provider: {record.providerConfirmedAt ? 'confirmed' : 'pending'} · Renter: {record.seekerConfirmedAt ? 'confirmed' : 'pending'}</p>
            {record.photos?.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{record.photos.map((photo) => <a className="text-xs font-semibold text-slate-800 underline" href={photo} key={photo} rel="noreferrer" target="_blank">View photo</a>)}</div>}
          </div>}

          {canSubmitInitial && <>
            <div className="mt-6">
              <label className="text-sm font-semibold text-slate-800" htmlFor="condition">Condition details <span className="text-red-700">*</span></label>
              <textarea className="mt-2 block min-h-32 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-black focus:outline-none focus:ring-4 focus:ring-slate-100" id="condition" maxLength={2000} minLength={2} onChange={(event) => setCondition(event.target.value)} required value={condition} />
            </div>
            <div className="mt-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Camera aria-hidden="true" size={17} />Condition photos <span className="text-red-700">*</span></div>
              <div className="mt-3"><CloudinaryImageUploader id="handoverPhotos" images={photos} maximum={20} onChange={setPhotos} purpose="handover" /></div>
            </div>
            <div className="mt-5">
              <label className="text-sm font-semibold text-slate-800" htmlFor="accessories">Included accessories <span className="font-normal text-slate-500">(optional)</span></label>
              <textarea className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-black focus:outline-none" id="accessories" onChange={(event) => setAccessoriesText(event.target.value)} placeholder="One item per line" value={accessoriesText} />
            </div>
            {stage === 'checkout' && <div className="mt-5"><label className="text-sm font-semibold text-slate-800" htmlFor="missingItems">Missing items <span className="font-normal text-slate-500">(optional)</span></label><textarea className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-black focus:outline-none" id="missingItems" onChange={(event) => setMissingItemsText(event.target.value)} placeholder="One item per line" value={missingItemsText} /></div>}
            <div className="mt-5"><label className="text-sm font-semibold text-slate-800" htmlFor="notes">Additional notes <span className="font-normal text-slate-500">(optional)</span></label><textarea className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-black focus:outline-none" id="notes" maxLength={2000} onChange={(event) => setNotes(event.target.value)} value={notes} /></div>
          </>}

          {record && currentUserConfirmed && !bothConfirmed && <p className="mt-5 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">You’ve confirmed this record. Waiting for the other participant.</p>}
          {stage === 'checkout' && !record && isProvider && <p className="mt-5 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">The renter submits the return record first. You can confirm it here once it’s available.</p>}
          {stage === 'checkout' && !checkedIn && <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">Both participants must confirm check-in before submitting a return.</p>}
          {record && bothConfirmed && <p className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-900">Both participants have confirmed this record.</p>}

          {canAct && !(stage === 'checkout' && !checkedIn) && <div className="mt-6 flex justify-end border-t border-slate-200 pt-5"><button className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-50" disabled={isSubmitting} type="submit"><Check aria-hidden="true" size={16} />{isSubmitting ? 'Saving…' : actionLabel}</button></div>}
        </form>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><ClipboardCheck aria-hidden="true" className="text-green-700" size={19} /><h2 className="font-semibold text-slate-950">Transaction record</h2></div><p className="mt-3 text-sm leading-6 text-slate-600">Both parties confirm condition records. Your updates are timestamped and saved to the booking.</p><div className="mt-4 space-y-3 text-xs"><p className="flex items-center gap-2 text-slate-700"><PackageCheck aria-hidden="true" size={15} />Check-in: {handover?.checkIn?.at ? new Date(handover.checkIn.at).toLocaleString() : 'Not recorded'}</p><p className="flex items-center gap-2 text-slate-700"><PackageCheck aria-hidden="true" size={15} />Check-out: {handover?.checkOut?.at ? new Date(handover.checkOut.at).toLocaleString() : 'Not recorded'}</p></div></section>
          <section className="rounded-2xl border border-slate-200 bg-green-50 p-5"><div className="flex items-center gap-2 text-green-800"><ShieldCheck aria-hidden="true" size={18} /><h2 className="text-sm font-semibold">Keep both sides informed</h2></div><p className="mt-2 text-xs leading-5 text-green-900">Record the item’s condition together and report damage through the transaction.</p></section>
        </aside>
      </div>
    </section>
  )
}

export default HandoverPage
