import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, getApiErrorMessage } from '../services/api.js'

function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const [token, setToken] = useState(searchParams.get('token') || '')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function verifyEmail(event) {
    event.preventDefault()
    setMessage('')
    setIsSubmitting(true)
    try {
      const { data } = await api.post('/auth/verify-email', { token: token.trim() })
      setMessage(data.message || 'Your email address is verified.')
    } catch (error) {
      setMessage(getApiErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto min-h-[65vh] max-w-xl px-5 py-12 sm:px-8 sm:py-20">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-green-700">Account security</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Verify your email</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Confirm the email address on your ShareGrid account using the token from your verification message.</p>
        <form className="mt-6 space-y-4" onSubmit={verifyEmail}>
          <label className="block text-sm font-semibold text-slate-800" htmlFor="verificationToken">Verification token</label>
          <input
            autoComplete="one-time-code"
            className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-black focus:ring-4 focus:ring-slate-100"
            id="verificationToken"
            onChange={(event) => setToken(event.target.value)}
            required
            value={token}
          />
          {message && <p aria-live="polite" className="rounded-xl bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-800">{message}</p>}
          <button className="w-full rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={isSubmitting || !token.trim()} type="submit">
            {isSubmitting ? 'Verifying…' : 'Verify email'}
          </button>
        </form>
        <Link className="mt-5 inline-flex text-sm font-semibold text-slate-700 hover:text-black" to="/login">Return to login</Link>
      </div>
    </section>
  )
}

export default VerifyEmailPage
