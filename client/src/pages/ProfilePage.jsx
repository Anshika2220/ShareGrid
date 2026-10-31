import { useState } from 'react'
import { ArrowLeft, CircleUserRound, RotateCcw, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
import IntegrationNotice from '../components/common/IntegrationNotice.jsx'

const initialProfile = {
  displayName: '',
  location: '',
  bio: '',
}

function ProfilePage() {
  const [profile, setProfile] = useState(initialProfile)
  const [hasDraft, setHasDraft] = useState(false)

  function updateField(event) {
    setProfile((current) => ({ ...current, [event.target.name]: event.target.value }))
    setHasDraft(true)
  }

  function discardDraft() {
    setProfile(initialProfile)
    setHasDraft(false)
  }

  return (
    <section className="mx-auto min-h-[70vh] max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-black"
        to="/dashboard"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        My ShareGrid
      </Link>

      <div className="mt-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Account</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">
          Your profile
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Introduce yourself to the people you rent from and share resources with.
        </p>
      </div>

      <div className="mt-8">
        <IntegrationNotice>
          Your profile hasn’t been loaded from an account yet. Changes below are a temporary local
          draft and won’t be saved or shared.
        </IntegrationNotice>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="grid size-16 place-items-center rounded-full bg-slate-100 text-slate-700">
            <CircleUserRound aria-hidden="true" size={34} />
          </div>
          <h2 className="mt-4 font-semibold text-slate-950">{profile.displayName || 'Your name'}</h2>
          <p className="mt-1 text-sm text-slate-500">{profile.location || 'Add your location'}</p>
          <p className="mt-5 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
            Rating, verification, and Honor Score will only appear here when provided by the backend.
          </p>
        </aside>

        <form
          className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"
          onSubmit={(event) => event.preventDefault()}
        >
          <h2 className="text-lg font-semibold text-slate-950">Public profile</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Only add information you’re comfortable sharing with other ShareGrid members.
          </p>

          <div className="mt-6 grid gap-5">
            <div>
              <label className="text-sm font-semibold text-slate-800" htmlFor="displayName">Display name</label>
              <input
                autoComplete="name"
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-black focus:ring-4 focus:ring-slate-100"
                id="displayName"
                name="displayName"
                onChange={updateField}
                placeholder="How should others address you?"
                value={profile.displayName}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-800" htmlFor="location">City or area</label>
              <input
                autoComplete="address-level2"
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-black focus:ring-4 focus:ring-slate-100"
                id="location"
                name="location"
                onChange={updateField}
                placeholder="For example, Pune"
                value={profile.location}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-800" htmlFor="bio">About you</label>
              <textarea
                className="mt-2 block min-h-32 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-black focus:ring-4 focus:ring-slate-100"
                id="bio"
                maxLength={500}
                name="bio"
                onChange={updateField}
                placeholder="Share a little about how you use or care for resources."
                value={profile.bio}
              />
              <p className="mt-1 text-right text-xs text-slate-500">{profile.bio.length}/500</p>
            </div>
          </div>

          {hasDraft && (
            <p aria-live="polite" className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
              Local draft only — these changes haven’t been saved.
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!hasDraft}
              onClick={discardDraft}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={16} />
              Discard draft
            </button>
            <button
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500"
              disabled
              title="Profile saving will be available when the backend contract is ready."
              type="submit"
            >
              <Save aria-hidden="true" size={16} />
              Save unavailable
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

export default ProfilePage
