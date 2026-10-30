import { ArrowUpRight, Boxes, HeartHandshake } from 'lucide-react'
import { Link } from 'react-router-dom'
import HealthIndicator from '../common/HealthIndicator.jsx'

function AppLayout({ children, health }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 sm:px-8">
          <Link aria-label="ShareGrid home" className="flex items-center gap-3" to="/">
            <span className="grid size-10 place-items-center rounded-lg bg-black text-white">
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
            <Link className="hidden text-sm font-semibold text-slate-600 transition hover:text-blue-700 sm:block" to="/#how-it-works">
              How it works
            </Link>
            <Link className="hidden text-sm font-semibold text-slate-600 transition hover:text-blue-700 sm:block" to="/login">
              Log in
            </Link>
            <Link
              className="hidden rounded-full border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 sm:inline-flex"
              to="/register"
            >
              Sign up
            </Link>
            <Link
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-700 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:gap-2 sm:px-4"
              to="/health"
            >
              API status <ArrowUpRight aria-hidden="true" size={16} />
            </Link>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="flex items-center gap-2">
            <HeartHandshake aria-hidden="true" className="text-blue-700" size={17} />
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
