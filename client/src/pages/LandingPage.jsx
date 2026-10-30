import { ArrowDown, ArrowRight, Building2, Camera, Laptop, MapPin, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import HealthIndicator from '../components/common/HealthIndicator.jsx'

const categories = [
  { label: 'Creative gear', detail: 'Cameras, audio and production tools', Icon: Camera },
  { label: 'Spaces', detail: 'Studios, rooms and places to work', Icon: Building2 },
  { label: 'Technology', detail: 'Computers and useful equipment', Icon: Laptop },
]

function LandingPage({ health }) {
  return (
    <>
      <section className="relative overflow-hidden bg-black text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -right-36 -top-56 size-[34rem] rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-32 size-[25rem] rounded-full border border-white/10" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-28">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-medium text-white">
              <Sparkles aria-hidden="true" size={16} />
              A community built around sharing
            </div>
            <h1 className="max-w-xl text-5xl font-bold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Access what you need. Share what you don’t.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Find the equipment and spaces you need from people who already have them. Put useful things to work, together.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black shadow-lg shadow-black/20 transition hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                to="/resources"
              >
                Explore ShareGrid <ArrowRight aria-hidden="true" size={17} />
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-white/50 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                to="/list-resource"
              >
                List your resource
              </Link>
              <a className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-slate-200 transition hover:text-white" href="#how-it-works">
                How it works <ArrowDown aria-hidden="true" size={16} />
              </a>
            </div>
            <div className="mt-8">
              <HealthIndicator health={health} />
            </div>
          </div>

          <div aria-label="ShareGrid helps people share creative equipment, workspaces, and technology" className="relative mx-auto w-full max-w-lg" role="img">
            <div aria-hidden="true" className="absolute -left-5 top-12 size-24 rounded-full bg-white/10 blur-2xl" />
            <div aria-hidden="true" className="absolute -bottom-4 right-5 size-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative rounded-2xl border border-white/15 bg-white/[0.06] p-5 shadow-2xl shadow-black/30 backdrop-blur sm:p-7">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="text-sm font-semibold text-white">Share what you have</p>
                  <p className="mt-1 text-xs text-slate-400">Discover useful things nearby</p>
                </div>
                <span className="grid size-10 place-items-center rounded-lg bg-white/10 text-white">
                  <MapPin aria-hidden="true" size={19} />
                </span>
              </div>
              <div className="mt-5 grid gap-3">
                {categories.map(({ label, detail, Icon }) => (
                  <div
                    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                    key={label}
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-white/10 text-white">
                      <Icon aria-hidden="true" size={21} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-white">{label}</span>
                      <span className="mt-1 block text-xs text-slate-400">{detail}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20" id="resources">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">A little less idle</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Good things are better when shared.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            From a camera for the weekend to a room for your next big idea, ShareGrid helps make access easier.
          </p>
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {categories.map(({ label, detail, Icon }) => (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/[0.02]" key={label}>
              <span className="grid size-11 place-items-center rounded-lg bg-slate-100 text-slate-900">
                <Icon aria-hidden="true" size={21} />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-slate-950">{label}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white" id="how-it-works">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 md:grid-cols-[0.8fr_1.2fr] md:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Simple by design</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Share more. Own less. Do more.
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              ['01', 'Find what you need', 'Explore useful resources shared by people and organisations.'],
              ['02', 'Connect with owners', 'Coordinate details directly around your request.'],
              ['03', 'Get to work', 'Make the most of the tools and spaces around you.'],
            ].map(([number, title, description]) => (
              <article className="border-t-2 border-blue-600 pt-4" key={number}>
                <p className="text-sm font-bold text-blue-700">{number}</p>
                <h3 className="mt-4 text-base font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Building a more shareable world.</h2>
          <p className="mt-1 text-sm text-slate-600">Connect to the ShareGrid API to start exploring live resources.</p>
        </div>
        <Link className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700" to="/resources">
          Explore resources <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </section>
    </>
  )
}

export default LandingPage
