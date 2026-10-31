import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, LoaderCircle, MessageSquareText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { api, getApiErrorMessage } from '../services/api.js'

function ConversationsPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    api.get('/conversations', { signal: controller.signal })
      .then(({ data }) => setConversations(data.data.items))
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(requestError))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [user.id])

  return (
    <section className="mx-auto min-h-[70vh] max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-black" to="/dashboard"><ArrowLeft aria-hidden="true" size={16} />My ShareGrid</Link>
      <div className="mt-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Booking conversations</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">Negotiations</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Keep resource questions, dates, and offers connected to a transaction.</p>
      </div>

      {error && <div className="mt-7 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}<button className="ml-3 font-semibold underline" onClick={() => window.location.reload()} type="button">Reload</button></div>}
      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {isLoading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle aria-hidden="true" className="animate-spin" size={17} />Loading conversations…</div> : conversations.length ? (
          <ul className="divide-y divide-slate-200">
            {conversations.map((conversation) => {
              const id = conversation._id || conversation.id
              const resource = conversation.resource
              const participants = conversation.participants || []
              const otherParticipant = participants.find((participant) => (participant._id || participant.id) !== user.id)
              const lastMessage = conversation.lastMessage || conversation.messages?.at(-1)
              return <li key={id}><Link className="flex items-center gap-4 p-5 transition hover:bg-slate-50 sm:p-6" to={`/conversations/${id}`}>
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-800"><MessageSquareText aria-hidden="true" size={21} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="truncate font-semibold text-slate-950">{resource?.title || 'Resource conversation'}</span><span className="text-xs text-slate-500">with {otherParticipant?.name || 'ShareGrid member'}</span></span>
                  <span className="mt-1 block truncate text-sm text-slate-600">{lastMessage?.body || 'Start a conversation about this resource.'}</span>
                  <span className="mt-2 block text-xs capitalize text-slate-500">{conversation.status?.replaceAll('_', ' ') || 'active'}{lastMessage?.createdAt ? ` · ${new Date(lastMessage.createdAt).toLocaleString()}` : ''}</span>
                </span>
                <ArrowRight aria-hidden="true" className="shrink-0 text-slate-500" size={18} />
              </Link></li>
            })}
          </ul>
        ) : !error ? <div className="px-6 py-14 text-center"><MessageSquareText aria-hidden="true" className="mx-auto text-slate-400" size={28} /><h2 className="mt-4 text-lg font-semibold text-slate-950">No conversations yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Open a resource and message its owner to start a conversation.</p><Link className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white" to="/resources">Explore resources <ArrowRight aria-hidden="true" size={16} /></Link></div> : null}
      </section>
    </section>
  )
}

export default ConversationsPage
