import { useState } from 'react'
import { Boxes, HeartHandshake, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import HealthIndicator from '../common/HealthIndicator.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getApiErrorMessage } from '../../services/api.js'

function AppLayout({ children, health }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [logoutError, setLogoutError] = useState('')

  async function handleLogout() {
    setLogoutError('')
    try {
      await logout()
      navigate('/')
    } catch (error) {
      setLogoutError(getApiErrorMessage(error))
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 sm:px-8">
          <Link aria-label="ShareGrid home" className="flex items-center gap-3" to="/">
            <span className="grid size-10 place-items-center rounded-lg bg-green-700 text-white">
              <Boxes aria-hidden="true" size={22} />
            </span>
            <span>
              <span className="block text-lg font-bold leading-tight tracking-[-0.06em] text-slate-950">
                ShareGrid
              </span>
              <span className="hidden text-xs text-slate-500 sm:block">Share more. Own less.</span>
            </span>
          </Link>

          <nav aria-label="Main navigation" className="flex items-center gap-3 sm:gap-7">
            <Link className="text-sm font-semibold text-slate-600 transition hover:text-blue-700" to="/resources">
              Discover
            </Link>
            <Link className="hidden text-sm font-semibold text-slate-600 transition hover:text-blue-700 md:block" to="/list-resource">
              List a resource
            </Link>
            <Link className="hidden text-sm font-semibold text-slate-600 transition hover:text-blue-700 lg:block" to="/dashboard">
              My ShareGrid
            </Link>
            <Link className="hidden text-sm font-semibold text-slate-600 transition hover:text-blue-700 sm:block" to="/#how-it-works">
              How it works
            </Link>
            {user ? (
              <>
                <Link className="hidden text-sm font-semibold text-slate-600 transition hover:text-blue-700 sm:block" to="/dashboard">
                  {user.name?.split(' ')[0] || 'My account'}
                </Link>
                {user.roles?.includes('admin') && <Link className="hidden items-center gap-1.5 text-sm font-semibold text-slate-700 transition hover:text-green-800 md:inline-flex" to="/admin"><ShieldCheck aria-hidden="true" size={15} />Admin</Link>}
                <button className="hidden rounded-full border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 sm:inline-flex" onClick={handleLogout} type="button">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link className="hidden text-sm font-semibold text-slate-600 transition hover:text-blue-700 sm:block" to="/login">Log in</Link>
                <Link className="hidden rounded-full border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 sm:inline-flex" to="/register">Sign up</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>{children}</main>
      {logoutError && <p aria-live="polite" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 shadow-lg">{logoutError}</p>}

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="flex items-center gap-2">
            <HeartHandshake aria-hidden="true" className="text-green-700" size={17} />
            Share more. Own less. Do more.
          </p>
          <div className="flex items-center gap-4">
            <HealthIndicator health={health} />
            <span>ShareGrid</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default AppLayout
