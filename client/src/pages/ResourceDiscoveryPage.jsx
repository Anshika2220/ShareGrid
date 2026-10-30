import { ArrowLeft, Boxes, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import IntegrationNotice from '../components/common/IntegrationNotice.jsx'

function ResourceDiscoveryPage() {
  return (
    <section className="mx-auto min-h-[65vh] max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700"
        to="/"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Back to home
      </Link>

      <div className="mt-8 max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">
          Resource marketplace
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          Find what you need.
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
          Explore equipment and spaces shared by people and organisations in your community.
        </p>
      </div>

      <div className="mt-8 max-w-3xl">
        <label
          className="flex cursor-not-allowed items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-400 shadow-sm"
          htmlFor="resource-search"
        >
          <Search aria-hidden="true" className="shrink-0" size={20} />
          <span className="sr-only">Search resources</span>
          <input
            className="w-full cursor-not-allowed bg-transparent text-sm outline-none placeholder:text-slate-400"
            disabled
            id="resource-search"
            placeholder="Search resources, brands, or models"
            type="search"
          />
        </label>
      </div>

      <div className="mt-8 max-w-3xl">
        <IntegrationNotice>
          The resource catalogue is waiting for the backend API contract. No sample listings are
          shown here, so you won’t mistake demo content for real inventory. Search and filters will
          be connected when the resource schema is available.
        </IntegrationNotice>
      </div>

      <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center sm:px-10">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
          <Boxes aria-hidden="true" size={25} />
        </span>
        <h2 className="mt-5 text-lg font-semibold text-slate-950">No live resources to show yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
          Listings will appear here after the catalogue is connected to ShareGrid’s backend.
        </p>
        <Link
          className="mt-6 inline-flex rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
          to="/"
        >
          Return to ShareGrid
        </Link>
      </div>
    </section>
  )
}

export default ResourceDiscoveryPage
