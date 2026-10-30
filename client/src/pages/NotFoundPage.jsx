import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section className="mx-auto grid min-h-[65vh] max-w-3xl content-center px-5 py-16 sm:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">404 — Page not found</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        This page isn’t here.
      </h1>
      <p className="mt-3 text-slate-600">The address may be incorrect, or the page may have moved.</p>
      <Link className="mt-6 inline-flex w-fit rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800" to="/">
        Return to ShareGrid
      </Link>
    </section>
  )
}

export default NotFoundPage
