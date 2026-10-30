import { ArrowLeft, FileSearch } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import IntegrationNotice from '../components/common/IntegrationNotice.jsx'

function ResourceDetailsPage() {
  const { resourceId } = useParams()

  return (
    <section className="mx-auto min-h-[65vh] max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700"
        to="/resources"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Back to resources
      </Link>

      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <span className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
          <FileSearch aria-hidden="true" size={23} />
        </span>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-blue-700">
          Resource details
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Listing details will appear here
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          The listing, availability, pricing, and verification details will come from the backend.
          ShareGrid won’t invent booking information or display unverified resources as verified.
        </p>

        <div className="mt-7">
          <IntegrationNotice>
            Resource details are not connected until the backend contract is available.
          </IntegrationNotice>
        </div>

        {resourceId && (
          <p className="mt-5 break-all text-xs text-slate-500">
            Requested listing reference: <code className="font-mono">{resourceId}</code>
          </p>
        )}

        <Link
          className="mt-7 inline-flex rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          to="/resources"
        >
          Browse resources
        </Link>
      </div>
    </section>
  )
}

export default ResourceDetailsPage
