import {
  ArrowLeft,
  CircleDollarSign,
  LockKeyhole,
  MessageSquareText,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import IntegrationNotice from '../components/common/IntegrationNotice.jsx'

function ConversationPage() {
  const { conversationId } = useParams()

  return (
    <section className="mx-auto min-h-[70vh] max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-black"
        to="/conversations"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Negotiations
      </Link>

      <div className="mt-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Transaction conversation</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">
          Chat and offers
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Conversation reference <code className="font-mono text-slate-900">{conversationId}</code>
        </p>
      </div>

      <div className="mt-7">
        <IntegrationNotice>
          Conversation data hasn’t been loaded. The reference alone does not establish access,
          participants, resource, booking, price, or negotiation status.
        </IntegrationNotice>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-label="Conversation messages" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
            <span className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-800">
              <MessageSquareText aria-hidden="true" size={19} />
            </span>
            <div>
              <h2 className="font-semibold text-slate-950">Messages</h2>
              <p className="text-xs text-slate-500">Linked to one resource transaction</p>
            </div>
          </div>

          <div className="grid min-h-64 place-items-center px-6 py-10 text-center">
            <div>
              <p className="font-semibold text-slate-950">No conversation loaded</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">
                Real messages will appear here after access is confirmed by the backend.
              </p>
            </div>
          </div>

          <form className="border-t border-slate-200 bg-slate-50 p-4" onSubmit={(event) => event.preventDefault()}>
            <label className="sr-only" htmlFor="message">Message</label>
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-500"
                disabled
                id="message"
                placeholder="Messages are unavailable until this conversation loads"
              />
              <button
                aria-label="Send message"
                className="grid size-11 shrink-0 cursor-not-allowed place-items-center rounded-lg bg-slate-200 text-slate-400"
                disabled
                type="submit"
              >
                <Send aria-hidden="true" size={17} />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Use transaction chat only for resource, pricing, dates, and handover details.</p>
          </form>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <CircleDollarSign aria-hidden="true" className="text-green-700" size={19} />
              <h2 className="font-semibold text-slate-950">Price and offers</h2>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ['Asking price', 'Not available'],
                ['Permitted range', 'Not available'],
                ['Current offer', 'Not available'],
                ['Negotiation status', 'Not available'],
              ].map(([label, value]) => (
                <div className="flex justify-between gap-3 border-b border-slate-100 pb-2" key={label}>
                  <dt className="text-slate-600">{label}</dt>
                  <dd className="text-right font-medium text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
            <button
              className="mt-5 w-full cursor-not-allowed rounded-full bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500"
              disabled
              title="Offers can only be made after backend negotiation data is loaded."
              type="button"
            >
              Make an offer
            </button>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              The backend controls offer ranges, expiry, and negotiation limits.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-100 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck aria-hidden="true" size={18} />
              <h2>Transaction safety</h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-700">
              Don’t share payment credentials or move a transaction off-platform.
            </p>
            <p className="mt-3 flex items-center gap-2 text-xs text-slate-600">
              <LockKeyhole aria-hidden="true" size={14} />
              Conversation access is not yet verified.
            </p>
          </section>
        </aside>
      </div>
    </section>
  )
}

export default ConversationPage
