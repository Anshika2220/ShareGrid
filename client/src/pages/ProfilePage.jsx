import { useEffect, useState } from 'react'
import { ArrowLeft, CircleUserRound, KeyRound, Save, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { api, getApiErrorMessage } from '../services/api.js'

function ProfilePage() {
  const { user, refreshUser, clearSession } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState({
    name: '',
    phone: '',
    bio: '',
    location: '',
    accountType: 'individual',
    avatarUrl: '',
  })
  const [savedValues, setSavedValues] = useState(null)
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [phoneCode, setPhoneCode] = useState('')
  const [developmentPhoneCode, setDevelopmentPhoneCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false)

  useEffect(() => {
    const profile = user.profile || {}
    const next = {
      name: user.name || '',
      phone: user.phone || '',
      bio: profile.bio || '',
      location: profile.location || '',
      accountType: profile.accountType || 'individual',
      avatarUrl: profile.avatarUrl || '',
    }
    setValues(next)
    setSavedValues(next)
  }, [user])

  function updateField(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }))
    setMessage('')
    setError('')
  }

  async function saveProfile(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSaving(true)
    try {
      const { name, phone, bio, location, accountType, avatarUrl } = values
      await api.patch('/users/me', {
        name: name.trim(),
        phone: phone.trim(),
        profile: {
          bio: bio.trim(),
          location: location.trim(),
          accountType,
          ...(avatarUrl.trim() ? { avatarUrl: avatarUrl.trim() } : {}),
        },
      })
      await refreshUser()
      setMessage('Your profile has been saved.')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setIsSaving(false)
    }
  }

  async function sendPhoneCode() {
    setError('')
    setMessage('')
    setIsVerifyingPhone(true)
    try {
      const { data } = await api.post('/auth/phone-verification/send')
      setDevelopmentPhoneCode(data.data.verificationCode || '')
      setMessage(data.message || 'A verification code has been sent to your phone.')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setIsVerifyingPhone(false)
    }
  }

  async function verifyPhone(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsVerifyingPhone(true)
    try {
      const { data } = await api.post('/auth/phone-verification/verify', { code: phoneCode.trim() })
      setDevelopmentPhoneCode('')
      setPhoneCode('')
      await refreshUser()
      setMessage(data.message || 'Your phone number is verified.')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setIsVerifyingPhone(false)
    }
  }

  async function changePassword(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (passwords.newPassword.length < 10 || passwords.newPassword.length > 128) {
      setError('Use a new password between 10 and 128 characters.')
      return
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('The new passwords do not match.')
      return
    }

    setIsChangingPassword(true)
    try {
      await api.patch('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      })
      clearSession()
      navigate('/login', { replace: true })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setIsChangingPassword(false)
    }
  }

  const hasChanges = savedValues && Object.keys(values).some((key) => values[key] !== savedValues[key])

  return (
    <section className="mx-auto min-h-[70vh] max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-black" to="/dashboard"><ArrowLeft aria-hidden="true" size={16} />My ShareGrid</Link>
      <div className="mt-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Account</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">Your profile</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Manage your account details and public profile.</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
          <div className="grid size-16 place-items-center overflow-hidden rounded-full bg-slate-100 text-slate-700">
            {values.avatarUrl ? <img alt="" className="size-full object-cover" src={values.avatarUrl} /> : <CircleUserRound aria-hidden="true" size={34} />}
          </div>
          <h2 className="mt-4 font-semibold text-slate-950">{values.name || 'Your name'}</h2>
          <p className="mt-1 text-sm text-slate-500">{values.location || 'Add your location'}</p>
          <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-sm">
            <p className="flex items-center justify-between gap-3"><span className="text-slate-500">Honor Score</span><strong className="text-slate-900">{user.honorScore ?? 0}</strong></p>
            <p className="flex items-center justify-between gap-3"><span className="text-slate-500">Rating</span><strong className="text-slate-900">{user.averageRating ? Number(user.averageRating).toFixed(1) : 'No reviews'}</strong></p>
            <p className="flex items-center justify-between gap-3"><span className="text-slate-500">Email</span><strong className="max-w-36 truncate text-slate-900">{user.email}</strong></p>
            {user.emailVerifiedAt && <p className="flex items-center gap-2 text-xs font-medium text-green-800"><ShieldCheck aria-hidden="true" size={15} />Email verified</p>}
          </div>
        </aside>

        <div className="space-y-6">
          <form className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7" onSubmit={saveProfile}>
            <h2 className="text-lg font-semibold text-slate-950">Public profile</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Only add information you’re comfortable sharing with other members.</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-800" htmlFor="name">Name</label>
                <input autoComplete="name" className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-black focus:outline-none focus:ring-4 focus:ring-slate-100" id="name" maxLength={100} name="name" onChange={updateField} required value={values.name} />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-800" htmlFor="phone">Phone</label>
                <input autoComplete="tel" className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-black focus:outline-none focus:ring-4 focus:ring-slate-100" id="phone" maxLength={30} name="phone" onChange={updateField} value={values.phone} />
                {user.phoneVerifiedAt && values.phone === user.phone && <span className="mt-1 block text-xs text-green-800">Verified</span>}
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-800" htmlFor="location">City or area</label>
                <input autoComplete="address-level2" className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-black focus:outline-none focus:ring-4 focus:ring-slate-100" id="location" maxLength={200} name="location" onChange={updateField} value={values.location} />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-800" htmlFor="accountType">Account type</label>
                <select className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-black focus:outline-none" id="accountType" name="accountType" onChange={updateField} value={values.accountType}>
                  <option value="individual">Individual</option><option value="business">Business</option><option value="institution">Institution</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-slate-800" htmlFor="avatarUrl">Profile photo URL <span className="font-normal text-slate-500">(optional)</span></label>
                <input className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-black focus:outline-none" id="avatarUrl" name="avatarUrl" onChange={updateField} type="url" value={values.avatarUrl} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-slate-800" htmlFor="bio">About you</label>
                <textarea className="mt-2 block min-h-32 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-black focus:outline-none focus:ring-4 focus:ring-slate-100" id="bio" maxLength={500} name="bio" onChange={updateField} value={values.bio} />
                <p className="mt-1 text-right text-xs text-slate-500">{values.bio.length}/500</p>
              </div>
            </div>
            {message && <p aria-live="polite" className="mt-5 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-900">{message}</p>}
            {error && <p aria-live="polite" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p>}
            <div className="mt-6 flex justify-end border-t border-slate-200 pt-5">
              <button className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50" disabled={!hasChanges || isSaving} type="submit"><Save aria-hidden="true" size={16} />{isSaving ? 'Saving…' : 'Save profile'}</button>
            </div>
          </form>

          {(!user.phoneVerifiedAt || values.phone !== user.phone) && values.phone && <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <div className="flex items-center gap-3"><ShieldCheck aria-hidden="true" className="text-green-700" size={19} /><div><h2 className="font-semibold text-slate-950">Verify your phone</h2><p className="mt-1 text-sm text-slate-600">Save your phone number first, then request a one-time verification code.</p></div></div>
            <button className="mt-5 rounded-full border border-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-50" disabled={isVerifyingPhone || hasChanges} onClick={sendPhoneCode} type="button">{isVerifyingPhone ? 'Sending…' : 'Send verification code'}</button>
            {developmentPhoneCode && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Development code: <strong className="font-mono">{developmentPhoneCode}</strong></p>}
            <form className="mt-4 flex flex-wrap gap-2" onSubmit={verifyPhone}><label className="sr-only" htmlFor="phoneCode">Six-digit verification code</label><input autoComplete="one-time-code" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm" id="phoneCode" inputMode="numeric" maxLength={6} onChange={(event) => setPhoneCode(event.target.value)} pattern="[0-9]{6}" placeholder="6-digit code" required value={phoneCode} /><button className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={isVerifyingPhone || phoneCode.length !== 6} type="submit">Verify phone</button></form>
          </section>}

          <form className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7" onSubmit={changePassword}>
            <div className="flex items-center gap-3"><KeyRound aria-hidden="true" className="text-green-700" size={19} /><h2 className="text-lg font-semibold text-slate-950">Change password</h2></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {[
                ['currentPassword', 'Current password'],
                ['newPassword', 'New password'],
                ['confirmPassword', 'Confirm new password'],
              ].map(([name, label]) => <div key={name}><label className="text-sm font-semibold text-slate-800" htmlFor={name}>{label}</label><input autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'} className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-3 text-sm text-slate-900 focus:border-black focus:outline-none" id={name} onChange={(event) => setPasswords((current) => ({ ...current, [name]: event.target.value }))} required type="password" value={passwords[name]} /></div>)}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">Changing your password will end your current session; log in again with your new password.</p>
            <div className="mt-5 flex justify-end border-t border-slate-200 pt-5"><button className="inline-flex items-center gap-2 rounded-full border border-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-50" disabled={isChangingPassword} type="submit">{isChangingPassword ? 'Updating…' : 'Update password'}</button></div>
          </form>
        </div>
      </div>
    </section>
  )
}

export default ProfilePage
