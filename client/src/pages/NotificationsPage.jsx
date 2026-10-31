import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Bell, BellRing, CheckCheck, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, getApiErrorMessage } from '../services/api.js'

function notificationLink(item) {
  if (item.data?.bookingId) return `/bookings/${item.data.bookingId}`
  if (item.data?.conversationId) return `/conversations/${item.data.conversationId}`
  if (item.data?.resourceId) return `/resources/${item.data.resourceId}`
  return null
}

function NotificationsPage() {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyIds, setBusyIds] = useState([])
  const [error, setError] = useState('')

  const loadNotifications = useCallback(async (signal) => {
    setIsLoading(true)
    setError('')
    try {
      const { data } = await api.get('/notifications/mine', { signal })
      setItems(data.data.items)
    } catch (requestError) {
      if (!signal?.aborted) setError(getApiErrorMessage(requestError))
    } finally {
      if (!signal?.aborted) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadNotifications(controller.signal)
    return () => controller.abort()
  }, [loadNotifications])

  async function markAsRead(item) {
    const id = item._id || item.id
    setBusyIds((current) => [...current, id])
    setError('')
    try {
      await api.patch(`/notifications/${id}/read`)
      setItems((current) => current.map((notification) => (notification._id || notification.id) === id
        ? { ...notification, readAt: notification.readAt || new Date().toISOString() }
        : notification))
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setBusyIds((current) => current.filter((busyId) => busyId !== id))
    }
  }

  const unreadCount = items.filter((item) => !item.readAt).length

  return (
    <section className="mx-auto min-h-[70vh] max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-black" to="/dashboard"><ArrowLeft aria-hidden="true" size={16} />My ShareGrid</Link>
      <div className="mt-8 flex items-end justify-between gap-4">
        <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Stay in the loop</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">Notifications</h1><p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Important updates about your ShareGrid activity.</p></div>
        <span className="hidden size-12 shrink-0 place-items-center rounded-xl bg-green-50 text-green-700 sm:grid"><Bell aria-hidden="true" size={22} /></span>
      </div>

      {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><p>{error}</p><button className="mt-2 font-semibold underline" onClick={() => loadNotifications()} type="button">Try again</button></div>}

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div><h2 className="font-semibold text-slate-950">Your updates</h2><p className="mt-1 text-xs text-slate-500">{unreadCount} unread</p></div>
          <button className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50" disabled={!unreadCount || busyIds.length > 0} onClick={async () => {
            const unreadItems = items.filter((item) => !item.readAt)
            await Promise.all(unreadItems.map((item) => markAsRead(item)))
          }} type="button"><CheckCheck aria-hidden="true" size={15} />Mark all as read</button>
        </header>

        {isLoading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle aria-hidden="true" className="animate-spin" size={17} />Loading updates…</div> : items.length ? (
          <ul className="divide-y divide-slate-200">
            {items.map((item) => {
              const id = item._id || item.id
              const href = notificationLink(item)
              const title = item.title || item.message || item.type?.replaceAll('_', ' ') || 'ShareGrid update'
              const content = item.body || item.description
              return <li className={`flex items-start gap-4 p-5 sm:px-6 ${item.readAt ? '' : 'bg-green-50/40'}`} key={id}>
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${item.readAt ? 'bg-slate-100 text-slate-600' : 'bg-green-100 text-green-800'}`}><BellRing aria-hidden="true" size={18} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold capitalize text-slate-950">{title}</h3>{!item.readAt && <span className="size-2 rounded-full bg-green-700" aria-label="Unread" />}</div>
                  {content && content !== title && <p className="mt-1 text-sm leading-6 text-slate-600">{content}</p>}
                  <p className="mt-2 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                  {href && <Link className="mt-2 inline-flex text-xs font-semibold text-slate-800 underline" to={href}>Open update</Link>}
                </div>
                {!item.readAt && <button className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-50" disabled={busyIds.includes(id)} onClick={() => markAsRead(item)} type="button">{busyIds.includes(id) ? 'Saving…' : 'Mark read'}</button>}
              </li>
            })}
          </ul>
        ) : !error ? <div className="px-6 py-14 text-center"><Bell aria-hidden="true" className="mx-auto text-slate-400" size={28} /><h2 className="mt-4 font-semibold text-slate-950">You’re all caught up</h2><p className="mt-2 text-sm text-slate-600">New booking, payment, and account updates will appear here.</p></div> : null}
      </section>
    </section>
  )
}

export default NotificationsPage
