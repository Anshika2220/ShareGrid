import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Boxes, MapPin, Search, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, getApiErrorMessage } from '../services/api.js'

const categories = [
  'Camera & photography',
  'Audio & music',
  'Computers & technology',
  'Tools & equipment',
  'Spaces & facilities',
  'Sports & outdoors',
  'Other',
]

function ResourceDiscoveryPage() {
  const [filters, setFilters] = useState({ q: '', category: '', city: '' })
  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setError('')
    api.get('/resources', {
      params: { ...appliedFilters, page, limit: 12 },
      signal: controller.signal,
    })
      .then(({ data }) => {
        setItems(data.data.items)
        setPagination(data.data.pagination)
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(requestError))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [appliedFilters, page])

  function applyFilters(event) {
    event.preventDefault()
    setPage(1)
    setAppliedFilters({ ...filters })
  }

  return (
    <section className="mx-auto min-h-[65vh] max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700" to="/">
        <ArrowLeft aria-hidden="true" size={16} /> Back to home
      </Link>

      <div className="mt-8 max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Resource marketplace</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Find what you need.</h1>
        <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
          Explore verified equipment and spaces shared by people and organisations in your community.
        </p>
      </div>

      <form className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1.5fr)_minmax(180px,0.8fr)_minmax(160px,0.7fr)_auto]" onSubmit={applyFilters}>
        <label className="flex items-center gap-3 rounded-xl border border-slate-300 px-3.5">
          <Search aria-hidden="true" className="shrink-0 text-slate-500" size={19} />
          <span className="sr-only">Search resources</span>
          <input
            className="min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            placeholder="Search resources, brands, or models"
            value={filters.q}
          />
        </label>
        <label className="sr-only" htmlFor="resource-category">Category</label>
        <select
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none focus:border-black"
          id="resource-category"
          onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
          value={filters.category}
        >
          <option value="">All categories</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <label className="sr-only" htmlFor="resource-city">City</label>
        <input
          className="rounded-xl border border-slate-300 px-3.5 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-black"
          id="resource-city"
          onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))}
          placeholder="City"
          value={filters.city}
        />
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800" type="submit">
          <SlidersHorizontal aria-hidden="true" size={17} /> Search
        </button>
      </form>

      <div className="mt-8 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-950">
          {isLoading ? 'Searching listings…' : `${pagination.total} ${pagination.total === 1 ? 'resource' : 'resources'}`}
        </h2>
        {pagination.pages > 1 && <p className="text-sm text-slate-500">Page {page} of {pagination.pages}</p>}
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
          <p>{error}</p>
          <button className="mt-3 font-semibold underline" onClick={() => setAppliedFilters({ ...appliedFilters })} type="button">Try again</button>
        </div>
      )}

      {isLoading ? (
        <div aria-label="Loading resources" className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => <div className="h-72 animate-pulse rounded-2xl bg-slate-200" key={index} />)}
        </div>
      ) : !error && items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-xl bg-slate-100 text-slate-700"><Boxes aria-hidden="true" size={25} /></span>
          <h2 className="mt-5 text-xl font-semibold text-slate-950">No matching resources</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Try a different search or remove a filter.</p>
        </div>
      ) : !error ? (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((resource) => {
              const resourceId = resource._id || resource.id
              const imageUrl = resource.images?.[0]
              return (
                <Link className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-400 hover:shadow-md" key={resourceId} to={`/resources/${resourceId}`}>
                  <div className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-slate-100">
                    {imageUrl ? (
                      <img alt={resource.title} className="size-full object-cover transition duration-300 group-hover:scale-[1.02]" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none' }} src={imageUrl} />
                    ) : <Boxes aria-hidden="true" className="text-slate-400" size={36} />}
                    <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-700">{resource.category}</span>
                  </div>
                  <div className="p-5">
                    <h3 className="truncate text-lg font-semibold text-slate-950">{resource.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{[resource.brand, resource.model].filter(Boolean).join(' · ') || resource.condition}</p>
                    <p className="mt-4 flex items-center gap-1.5 text-sm text-slate-600"><MapPin aria-hidden="true" size={15} />{resource.location?.city || resource.city || 'Location available in details'}</p>
                    <p className="mt-4 flex items-baseline gap-1">
                      <span className="text-xl font-bold text-slate-950">₹{Number(resource.price).toLocaleString('en-IN')}</span>
                      <span className="text-xs text-slate-500">/ {resource.pricingUnit === 'hourly' ? 'hour' : 'day'}</span>
                      <ArrowRight aria-hidden="true" className="ml-auto text-slate-700" size={17} />
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
          {pagination.pages > 1 && (
            <nav aria-label="Resource pages" className="mt-8 flex items-center justify-center gap-4">
              <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} type="button">Previous</button>
              <span className="text-sm text-slate-600">{page} / {pagination.pages}</span>
              <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40" disabled={page >= pagination.pages} onClick={() => setPage((current) => current + 1)} type="button">Next</button>
            </nav>
          )}
        </>
      ) : null}
    </section>
  )
}

export default ResourceDiscoveryPage
