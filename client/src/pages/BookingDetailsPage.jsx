import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  CircleDollarSign,
  ClipboardCheck,
  LoaderCircle,
  MessageSquareText,
  PackageCheck,
  ShieldAlert,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { api, getApiErrorMessage } from '../services/api.js'

async function loadRazorpayCheckout() {
  if (window.Razorpay) return
  await new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = resolve
    script.onerror = () => reject(new Error('Could not load the secure payment checkout. Please try again.'))
    document.body.appendChild(script)
  })
}

function BookingDetailsPage() {
  const { bookingId } = useParams()
  const { user } = useAuth()
  const [booking, setBooking] = useState(null)
  const [handover, setHandover] = useState(null)
  const [deposit, setDeposit] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [busyAction, setBusyAction] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadBooking = useCallback(async (signal) => {
    setIsLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/bookings/${bookingId}`, { signal })
      setBooking(data.data.booking)
      const results = await Promise.allSettled([
        api.get(`/bookings/${bookingId}/handover`, { signal }),
        api.get(`/bookings/${bookingId}/deposit`, { signal }),
      ])
      if (signal?.aborted) return
      if (results[0].status === 'fulfilled') setHandover(results[0].value.data.data.handover)
      if (results[1].status === 'fulfilled') setDeposit(results[1].value.data.data)
    } catch (requestError) {
      if (!signal?.aborted) setError(getApiErrorMessage(requestError))
    } finally {
      if (!signal?.aborted) setIsLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    const controller = new AbortController()
    loadBooking(controller.signal)
    return () => controller.abort()
  }, [loadBooking])

  async function performAction(action, path, body) {
    setBusyAction(action)
    setError('')
    setNotice('')
    try {
      const { data } = await api.post(path, body)
      if (data.data.booking) setBooking(data.data.booking)
      setNotice(data.message || 'Your action was completed.')
      await loadBooking()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setBusyAction('')
    }
  }

  async function decide(decision) {
    setBusyAction(decision)
    setError('')
    setNotice('')
    try {
      const { data } = await api.patch(`/bookings/${bookingId}/decision`, { decision })
      setBooking(data.data.booking)
      setNotice(data.message || `Booking ${decision}d.`)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setBusyAction('')
    }
  }

  async function pay() {
    setBusyAction('payment')
    setError('')
    setNotice('')
    try {
      const { data } = await api.post('/payments/create-order', { bookingId })
      const order = data.data
      if (order.demo) {
        const verified = await api.post('/payments/verify', { paymentId: order.paymentId, demoPaymentConfirmed: true })
        setBooking(verified.data.data.booking)
        setNotice('Demo payment confirmed. No real money was moved.')
      } else {
        await loadRazorpayCheckout()
        const checkout = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.orderId,
          name: 'ShareGrid',
          description: booking.resource?.title || 'Resource booking',
          handler: async (response) => {
            try {
              const verified = await api.post('/payments/verify', {
                paymentId: order.paymentId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              })
              setBooking(verified.data.data.booking)
              setNotice('Payment verified and booking confirmed.')
            } catch (requestError) {
              setError(getApiErrorMessage(requestError))
            } finally {
              setBusyAction('')
            }
          },
          modal: { ondismiss: () => setBusyAction('') },
          theme: { color: '#078b4f' },
        })
        checkout.open()
        return
      }
      await loadBooking()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setBusyAction('')
    }
  }

  async function refundDeposit() {
    const reason = window.prompt('Reason for deposit refund:')
    if (!reason?.trim()) return
    await performAction('refund', `/bookings/${bookingId}/deposit/refund`, { reason: reason.trim() })
  }

  if (isLoading) return <div className="mx-auto grid min-h-[55vh] place-items-center text-sm text-slate-600"><LoaderCircle aria-hidden="true" className="animate-spin" />Loading booking…</div>
  if (error && !booking) return <section className="mx-auto min-h-[55vh] max-w-4xl px-5 py-12"><Link className="inline-flex items-center gap-2 text-sm font-semibold" to="/bookings"><ArrowLeft aria-hidden="true" size={16} />Bookings</Link><p className="mt-7 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</p></section>
  if (!booking) return null

  const idOf = (value) => value?._id || value?.id || value
  const isSeeker = idOf(booking.seeker) === user.id
  const isProvider = idOf(booking.provider) === user.id
  const canDecide = isProvider && booking.status === 'requested'
  const canPay = isSeeker && ['approved', 'pending_payment'].includes(booking.status) && !['captured', 'paid'].includes(booking.paymentStatus)
  const canCancel = ['requested', 'approved', 'confirmed'].includes(booking.status)
  const resource = booking.resource
  const currencyAmount = Number(booking.totalAmount ?? booking.amount ?? booking.pricing?.total ?? 0)
  const handoverDone = Boolean(booking.status === 'returned' || booking.status === 'completed')

  return (
    <section className="mx-auto min-h-[70vh] max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-black" to="/bookings"><ArrowLeft aria-hidden="true" size={16} />Bookings</Link>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-5">
        <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Transaction</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">Booking details</h1><p className="mt-3 text-sm text-slate-600">Reference <code className="font-mono text-slate-900">{bookingId}</code></p></div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold capitalize text-slate-700">{booking.status?.replaceAll('_', ' ')}</span>
      </div>

      {error && <p aria-live="polite" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</p>}
      {notice && <p aria-live="polite" className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-900">{notice}</p>}

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div><h2 className="text-xl font-semibold text-slate-950">{resource?.title || 'Resource booking'}</h2><p className="mt-2 text-sm text-slate-600">{new Date(booking.start).toLocaleString()} – {new Date(booking.end).toLocaleString()}</p></div>
              {resource?.images?.[0] && <img alt="" className="size-20 rounded-xl object-cover" src={resource.images[0]} />}
            </div>
            <div className="mt-5 grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
              <p className="text-sm text-slate-600">Renter <strong className="block mt-1 text-slate-950">{booking.seeker?.name || 'ShareGrid member'}</strong></p>
              <p className="text-sm text-slate-600">Provider <strong className="block mt-1 text-slate-950">{booking.provider?.name || 'ShareGrid member'}</strong></p>
              <p className="text-sm text-slate-600">Rental total <strong className="block mt-1 text-slate-950">₹{currencyAmount.toLocaleString('en-IN')}</strong></p>
              <p className="text-sm text-slate-600">Payment <strong className="block mt-1 capitalize text-slate-950">{booking.paymentStatus || 'Not paid'}</strong></p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2"><PackageCheck aria-hidden="true" className="text-green-700" size={19} /><h2 className="font-semibold text-slate-950">Handover and return</h2></div>
            {handover ? <div className="mt-4 grid gap-3 sm:grid-cols-2"><p className="rounded-xl bg-slate-50 p-4 text-sm"><strong className="block text-slate-900">Check-in</strong><span className="mt-1 block text-slate-600">{handover.checkIn?.condition || 'Not submitted'}</span><span className="mt-2 block text-xs text-slate-500">{handover.checkIn?.submittedAt ? new Date(handover.checkIn.submittedAt).toLocaleString() : ''}</span></p><p className="rounded-xl bg-slate-50 p-4 text-sm"><strong className="block text-slate-900">Check-out</strong><span className="mt-1 block text-slate-600">{handover.checkOut?.condition || 'Not submitted'}</span><span className="mt-2 block text-xs text-slate-500">{handover.checkOut?.submittedAt ? new Date(handover.checkOut.submittedAt).toLocaleString() : ''}</span></p></div> : <p className="mt-3 text-sm text-slate-600">No handover record is available yet.</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {['confirmed', 'checked_out', 'returned'].includes(booking.status) && <Link className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50" to={`/bookings/${bookingId}/handover`}><ClipboardCheck aria-hidden="true" size={15} />Open handover</Link>}
              <Link className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50" to={`/bookings/${bookingId}/incident`}><ShieldAlert aria-hidden="true" size={15} />Report incident</Link>
              {booking.status === 'completed' && <Link className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50" to={`/bookings/${bookingId}/review`}>Leave a review</Link>}
            </div>
          </section>

          {deposit && <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center gap-2"><CircleDollarSign aria-hidden="true" className="text-green-700" size={19} /><h2 className="font-semibold text-slate-950">Deposit ledger</h2></div><p className="mt-3 text-sm text-slate-600">Required: <strong className="text-slate-950">₹{Number(deposit.requiredAmount || 0).toLocaleString('en-IN')}</strong></p><ul className="mt-3 divide-y divide-slate-200">{deposit.transactions?.map((transaction) => <li className="flex justify-between gap-3 py-2 text-sm" key={transaction._id || transaction.id}><span className="capitalize text-slate-700">{transaction.type?.replaceAll('_', ' ')}</span><span className="font-semibold text-slate-900">₹{Number(transaction.amount).toLocaleString('en-IN')}</span></li>)}</ul>{isProvider && booking.status === 'completed' && <button className="mt-4 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50" disabled={busyAction === 'refund'} onClick={refundDeposit} type="button">Refund deposit</button>}</section>}
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div><h2 className="text-lg font-semibold text-slate-950">Next steps</h2><p className="mt-2 text-sm leading-6 text-slate-600">{isSeeker ? 'Your booking updates and payment actions.' : 'Review and manage this rental request.'}</p></div>
          {canDecide && <div className="grid gap-2"><button className="rounded-full bg-green-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={Boolean(busyAction)} onClick={() => decide('approve')} type="button">{busyAction === 'approve' ? 'Approving…' : 'Approve request'}</button><button className="rounded-full border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-800 disabled:opacity-50" disabled={Boolean(busyAction)} onClick={() => decide('reject')} type="button">{busyAction === 'reject' ? 'Rejecting…' : 'Reject request'}</button></div>}
          {canPay && <button className="w-full rounded-full bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" disabled={Boolean(busyAction)} onClick={pay} type="button">{busyAction === 'payment' ? 'Preparing secure payment…' : 'Pay and confirm booking'}</button>}
          {isProvider && booking.status === 'returned' && <button className="w-full rounded-full bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" disabled={Boolean(busyAction)} onClick={() => {
            const reason = window.prompt('Confirm inspection outcome:')
            if (reason?.trim()) performAction('inspection', `/bookings/${bookingId}/complete-inspection`, { reason: reason.trim() })
          }} type="button">Complete inspection</button>}
          {canCancel && <button className="w-full rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 disabled:opacity-50" disabled={Boolean(busyAction)} onClick={() => {
            if (window.confirm('Cancel this booking request?')) performAction('cancel', `/bookings/${bookingId}/cancel`)
          }} type="button">{busyAction === 'cancel' ? 'Cancelling…' : 'Cancel booking'}</button>}
          <Link className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50" to="/conversations"><MessageSquareText aria-hidden="true" size={16} />Negotiations</Link>
          <p className="flex items-start gap-2 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500"><ShieldAlert aria-hidden="true" className="mt-0.5 shrink-0" size={15} />Provider approval does not confirm the booking; payment must be verified first.</p>
          {handoverDone && <p className="text-xs text-green-800">Return record is submitted. Provider inspection completes the booking.</p>}
        </aside>
      </div>
    </section>
  )
}

export default BookingDetailsPage
