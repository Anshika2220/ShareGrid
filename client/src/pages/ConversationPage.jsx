import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Ban, CircleDollarSign, LoaderCircle, MessageSquareText, Send, ShieldCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { api, getApiErrorMessage } from '../services/api.js'

function ConversationPage() {
  const { conversationId } = useParams()
  const { user } = useAuth()
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [offers, setOffers] = useState([])
  const [messageBody, setMessageBody] = useState('')
  const [offerAmount, setOfferAmount] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [busyOfferId, setBusyOfferId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadConversation = useCallback(async (signal) => {
    setIsLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/conversations/${conversationId}`, { signal })
      setConversation(data.data.conversation)
      setMessages(data.data.messages)
      setOffers(data.data.offers)
    } catch (requestError) {
      if (!signal?.aborted) setError(getApiErrorMessage(requestError))
    } finally {
      if (!signal?.aborted) setIsLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    const controller = new AbortController()
    loadConversation(controller.signal)
    return () => controller.abort()
  }, [loadConversation])

  async function sendMessage(event) {
    event.preventDefault()
    if (!messageBody.trim()) return
    setIsSending(true)
    setError('')
    setNotice('')
    try {
      const { data } = await api.post(`/conversations/${conversationId}/messages`, { body: messageBody.trim() })
      setMessages((current) => [...current, data.data.message])
      setMessageBody('')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setIsSending(false)
    }
  }

  async function createOffer(event) {
    event.preventDefault()
    const amount = Number(offerAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter an offer amount greater than zero.')
      return
    }
    setError('')
    setNotice('')
    try {
      const { data } = await api.post(`/conversations/${conversationId}/offers`, { amount })
      setOffers((current) => [...current, data.data.offer])
      setNotice(`Offer sent. The allowed range is ₹${data.data.permittedPriceRange.minimum}–₹${data.data.permittedPriceRange.maximum}.`)
      setOfferAmount('')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    }
  }

  async function updateOffer(offer, action) {
    const id = offer._id || offer.id
    setBusyOfferId(id)
    setError('')
    setNotice('')
    try {
      const { data } = await api.patch(`/offers/${id}/${action}`)
      setOffers((current) => current.map((item) => (item._id || item.id) === id ? data.data.offer : item))
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setBusyOfferId('')
    }
  }

  async function counterOffer(offer) {
    const amount = Number(window.prompt('Enter your counteroffer amount in INR:'))
    if (!Number.isFinite(amount) || amount <= 0) return
    const id = offer._id || offer.id
    setBusyOfferId(id)
    setError('')
    try {
      const { data } = await api.post(`/offers/${id}/counter`, { amount })
      setOffers((current) => [...current, data.data.offer])
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setBusyOfferId('')
    }
  }

  async function blockConversation() {
    if (!window.confirm('Block this conversation? You will no longer be able to message in it.')) return
    setError('')
    try {
      const { data } = await api.patch(`/conversations/${conversationId}/block`)
      setConversation((current) => ({ ...current, status: data.data.status }))
      setNotice('Conversation blocked.')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    }
  }

  if (isLoading) return <div className="mx-auto grid min-h-[55vh] place-items-center text-sm text-slate-600"><LoaderCircle aria-hidden="true" className="animate-spin" />Loading conversation…</div>
  if (error && !conversation) return <section className="mx-auto min-h-[55vh] max-w-4xl px-5 py-12"><Link className="inline-flex items-center gap-2 text-sm font-semibold" to="/conversations"><ArrowLeft aria-hidden="true" size={16} />Negotiations</Link><p className="mt-7 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</p></section>

  const resource = conversation?.resource
  const otherParticipant = conversation?.participants?.find((person) => (person._id || person.id) !== user.id)
  const isBlocked = conversation?.status === 'blocked'
  const activeOffer = [...offers].reverse().find((offer) => ['pending', 'countered'].includes(offer.status))

  return (
    <section className="mx-auto min-h-[70vh] max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-black" to="/conversations"><ArrowLeft aria-hidden="true" size={16} />Negotiations</Link>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Resource conversation</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-4xl">{resource?.title || 'Chat and offers'}</h1><p className="mt-2 text-sm text-slate-600">Conversation with {otherParticipant?.name || 'ShareGrid member'}</p></div>
        <button className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50" disabled={isBlocked} onClick={blockConversation} type="button"><Ban aria-hidden="true" size={15} />{isBlocked ? 'Blocked' : 'Block conversation'}</button>
      </div>

      {error && <p aria-live="polite" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</p>}
      {notice && <p aria-live="polite" className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-900">{notice}</p>}

      <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
            <span className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-800"><MessageSquareText aria-hidden="true" size={19} /></span>
            <div><h2 className="font-semibold text-slate-950">Messages</h2><p className="text-xs text-slate-500">Keep communication on ShareGrid</p></div>
          </div>
          <div aria-live="polite" className="flex max-h-[60vh] min-h-64 flex-col gap-3 overflow-y-auto p-5">
            {messages.length ? messages.map((message) => {
              const own = (message.sender?._id || message.sender?.id || message.sender) === user.id
              return <article className={`max-w-[85%] rounded-2xl px-4 py-3 ${own ? 'ml-auto bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`} key={message._id || message.id}>
                <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p>
                <p className={`mt-2 text-right text-[11px] ${own ? 'text-slate-300' : 'text-slate-500'}`}>{new Date(message.createdAt).toLocaleString()}</p>
              </article>
            }) : <p className="m-auto text-center text-sm text-slate-500">Start the conversation with a message.</p>}
          </div>
          <form className="border-t border-slate-200 bg-slate-50 p-4" onSubmit={sendMessage}>
            <label className="sr-only" htmlFor="message">Message</label>
            <div className="flex gap-2">
              <input className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" id="message" maxLength={2000} onChange={(event) => setMessageBody(event.target.value)} placeholder={isBlocked ? 'This conversation is blocked' : 'Write a message…'} value={messageBody} disabled={isBlocked} />
              <button aria-label="Send message" className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-700 text-white disabled:opacity-50" disabled={isSending || isBlocked || !messageBody.trim()} type="submit"><Send aria-hidden="true" size={17} /></button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2"><CircleDollarSign aria-hidden="true" className="text-green-700" size={19} /><h2 className="font-semibold text-slate-950">Price and offers</h2></div>
            {resource && <p className="mt-4 text-sm text-slate-600">Asking price <strong className="text-slate-950">₹{Number(resource.price).toLocaleString('en-IN')} / {resource.pricingUnit === 'hourly' ? 'hour' : 'day'}</strong></p>}
            {activeOffer && <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-900">Current offer: <strong>₹{Number(activeOffer.amount).toLocaleString('en-IN')}</strong> · {activeOffer.status}</p>}
            <form className="mt-4" onSubmit={createOffer}>
              <label className="text-xs font-semibold text-slate-700" htmlFor="offerAmount">Your offer (INR)</label>
              <div className="mt-2 flex gap-2"><input className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm" id="offerAmount" min="1" onChange={(event) => setOfferAmount(event.target.value)} placeholder="Amount" type="number" value={offerAmount} /><button className="rounded-xl bg-blue-700 px-3 text-sm font-semibold text-white disabled:opacity-50" disabled={isBlocked || !offerAmount} type="submit">Send</button></div>
            </form>
            <ul className="mt-5 space-y-3">
              {offers.map((offer) => {
                const id = offer._id || offer.id
                const ownOffer = (offer.createdBy?._id || offer.createdBy?.id || offer.createdBy) === user.id
                return <li className="rounded-xl border border-slate-200 p-3" key={id}>
                  <p className="flex justify-between gap-2 text-sm"><strong className="text-slate-950">₹{Number(offer.amount).toLocaleString('en-IN')}</strong><span className="text-xs capitalize text-slate-500">{offer.status?.replaceAll('_', ' ')}</span></p>
                  {offer.status === 'pending' && !ownOffer && <div className="mt-3 flex gap-2"><button className="flex-1 rounded-lg bg-green-700 px-2 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={busyOfferId === id} onClick={() => updateOffer(offer, 'accept')} type="button">Accept</button><button className="flex-1 rounded-lg border border-slate-300 px-2 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50" disabled={busyOfferId === id} onClick={() => updateOffer(offer, 'reject')} type="button">Reject</button><button className="flex-1 rounded-lg border border-slate-300 px-2 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50" disabled={busyOfferId === id} onClick={() => counterOffer(offer)} type="button">Counter</button></div>}
                </li>
              })}
            </ul>
            <p className="mt-4 text-xs leading-5 text-slate-500">Offer limits and price ranges are enforced by ShareGrid.</p>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-green-50 p-5"><div className="flex items-center gap-2 text-sm font-semibold text-green-900"><ShieldCheck aria-hidden="true" size={18} /><h2>Transaction safety</h2></div><p className="mt-2 text-xs leading-5 text-green-900">Never share payment credentials or move a transaction off-platform.</p></section>
        </aside>
      </div>
    </section>
  )
}

export default ConversationPage
