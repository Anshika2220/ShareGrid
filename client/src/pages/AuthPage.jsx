import { useState } from 'react'
import { ArrowLeft, Boxes, Eye, EyeOff, KeyRound, Mail, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import IntegrationNotice from '../components/common/IntegrationNotice.jsx'

const pageContent = {
  login: {
    eyebrow: 'Welcome back',
    title: 'Log in to ShareGrid',
    description: 'Access your bookings, listings, and conversations.',
    submitLabel: 'Log in',
  },
  register: {
    eyebrow: 'Join the community',
    title: 'Create your account',
    description: 'One account lets you find resources and share your own.',
    submitLabel: 'Create account',
  },
  'forgot-password': {
    eyebrow: 'Account recovery',
    title: 'Reset your password',
    description: 'Enter the email address associated with your account.',
    submitLabel: 'Continue',
  },
}

function AuthPage({ mode }) {
  const content = pageContent[mode]
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  function updateField(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setFormMessage('')
    setErrors((current) => {
      if (!current[name] && !(name === 'password' && current.confirmPassword)) return current
      const next = { ...current }
      delete next[name]
      if (name === 'password' || name === 'confirmPassword') {
        delete next.confirmPassword
      }
      return next
    })
  }

  function validate() {
    const nextErrors = {}
    const email = values.email.trim()

    if (mode === 'register' && !values.name.trim()) {
      nextErrors.name = 'Enter your name.'
    }

    if (!email) {
      nextErrors.email = 'Enter your email address.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (mode !== 'forgot-password' && !values.password) {
      nextErrors.password = 'Enter your password.'
    }

    if (mode === 'register' && values.password && values.password !== values.confirmPassword) {
      nextErrors.confirmPassword = 'The passwords do not match.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleSubmit(event) {
    event.preventDefault()
    setFormMessage('')
    if (!validate()) return

    setFormMessage('Your details are valid, but this form is not connected to the backend yet. Nothing was sent.')
  }

  const inputClass = (field) =>
    `mt-2 block w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${
      errors[field] ? 'border-red-400' : 'border-slate-300'
    }`

  return (
    <section className="mx-auto grid min-h-[72vh] max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1fr_0.85fr] lg:gap-20">
      <div className="mx-auto w-full max-w-md">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700"
          to="/"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Back to ShareGrid
        </Link>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">
            {content.eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {content.title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{content.description}</p>

          <form className="mt-7 space-y-5" noValidate onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div>
                <label className="text-sm font-semibold text-slate-800" htmlFor="name">
                  Full name
                </label>
                <div className="relative">
                  <UserRound aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    autoComplete="name"
                    className={`${inputClass('name')} pl-11`}
                    id="name"
                    name="name"
                    onChange={updateField}
                    value={values.name}
                  />
                </div>
                {errors.name && <p className="mt-1.5 text-sm text-red-700">{errors.name}</p>}
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-slate-800" htmlFor="email">
                Email address
              </label>
              <div className="relative">
                <Mail aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  autoComplete="email"
                  className={`${inputClass('email')} pl-11`}
                  id="email"
                  name="email"
                  onChange={updateField}
                  placeholder="you@example.com"
                  type="email"
                  value={values.email}
                />
              </div>
              {errors.email && <p className="mt-1.5 text-sm text-red-700">{errors.email}</p>}
            </div>

            {mode !== 'forgot-password' && (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-slate-800" htmlFor="password">
                    Password
                  </label>
                  {mode === 'login' && (
                    <Link className="text-xs font-semibold text-blue-700 hover:text-blue-800" to="/forgot-password">
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <KeyRound aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    className={`${inputClass('password')} py-3 pl-11 pr-12`}
                    id="password"
                    name="password"
                    onChange={updateField}
                    type={showPassword ? 'text' : 'password'}
                    value={values.password}
                  />
                  <button
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-700"
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    {showPassword ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1.5 text-sm text-red-700">{errors.password}</p>}
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="text-sm font-semibold text-slate-800" htmlFor="confirmPassword">
                  Confirm password
                </label>
                <input
                  autoComplete="new-password"
                  className={inputClass('confirmPassword')}
                  id="confirmPassword"
                  name="confirmPassword"
                  onChange={updateField}
                  type={showPassword ? 'text' : 'password'}
                  value={values.confirmPassword}
                />
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-sm text-red-700">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            {formMessage && (
              <p aria-live="polite" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
                {formMessage}
              </p>
            )}

            <button
              className="inline-flex w-full items-center justify-center rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              type="submit"
            >
              {content.submitLabel}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            {mode === 'register' ? (
              <>Already have an account? <Link className="font-semibold text-blue-700 hover:text-blue-800" to="/login">Log in</Link></>
            ) : mode === 'login' ? (
              <>New to ShareGrid? <Link className="font-semibold text-blue-700 hover:text-blue-800" to="/register">Create an account</Link></>
            ) : (
              <>Remembered your password? <Link className="font-semibold text-blue-700 hover:text-blue-800" to="/login">Log in</Link></>
            )}
          </p>
        </div>
      </div>

      <aside className="hidden max-w-lg lg:block">
        <div className="grid size-14 place-items-center rounded-2xl bg-blue-700 text-white shadow-lg shadow-blue-900/15">
          <Boxes aria-hidden="true" size={27} />
        </div>
        <h2 className="mt-7 text-3xl font-semibold leading-tight tracking-tight text-slate-950">
          One account. More ways to share.
        </h2>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Find equipment and spaces when you need them, or make your own resources available to others.
          You can do both with the same account.
        </p>
        <div className="mt-8">
          <IntegrationNotice>
            Account actions are not connected yet. Form validation is available, but details are not
            sent or stored.
          </IntegrationNotice>
        </div>
      </aside>
    </section>
  )
}

export default AuthPage
