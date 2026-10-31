import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Building2, FileText, LoaderCircle, ShieldCheck, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, getApiErrorMessage } from '../services/api.js'

const organisationTypes = ['business', 'institution', 'nonprofit', 'other']
const evidenceKinds = ['registration_document', 'authorisation', 'asset_register', 'other']

function OrganisationsPage() {
  const [memberships, setMemberships] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState('business')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState('representative')
  const [evidenceKind, setEvidenceKind] = useState('registration_document')
  const [evidenceFile, setEvidenceFile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadOrganisations(signal) {
    setIsLoading(true)
    setError('')
    try {
      const { data } = await api.get('/organisations/mine', { signal })
      const next = data.data.items
      setMemberships(next)
      setSelectedId((current) => current || (next[0]?.organisation?._id || next[0]?.organisation?.id || next[0]?._id))
    } catch (requestError) {
      if (!signal?.aborted) setError(getApiErrorMessage(requestError))
    } finally {
      if (!signal?.aborted) setIsLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    loadOrganisations(controller.signal)
    return () => controller.abort()
  }, [])

  const organisation = useMemo(() => memberships
    .map((membership) => ({ membership, organisation: membership.organisation || membership }))
    .find(({ organisation: item }) => (item._id || item.id) === selectedId), [memberships, selectedId])

  async function createOrganisation(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setIsSubmitting(true)
    try {
      const { data } = await api.post('/organisations', {
        name: name.trim(),
        type,
        ...(registrationNumber.trim() ? { registrationNumber: registrationNumber.trim() } : {}),
      })
      const created = data.data.organisation
      setName('')
      setRegistrationNumber('')
      setNotice(data.message || 'Organisation created. Submit its evidence for review.')
      await loadOrganisations()
      setSelectedId(created._id || created.id)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function uploadEvidence(event) {
    event.preventDefault()
    if (!selectedId || !evidenceFile) {
      setError('Choose an organisation and evidence file.')
      return
    }
    if (evidenceFile.size > 10 * 1024 * 1024) {
      setError('Evidence files must be 10 MB or smaller.')
      return
    }
    setError('')
    setNotice('')
    setIsSubmitting(true)
    try {
      const body = new FormData()
      body.append('file', evidenceFile)
      body.append('kind', evidenceKind)
      const { data } = await api.post(`/organisations/${selectedId}/evidence`, body)
      setEvidenceFile(null)
      event.target.reset()
      setNotice(data.message || 'Private organisation evidence uploaded.')
      await loadOrganisations()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function addMember(event) {
    event.preventDefault()
    if (!selectedId) return
    setError('')
    setNotice('')
    setIsSubmitting(true)
    try {
      const { data } = await api.post(`/organisations/${selectedId}/members`, { email: memberEmail.trim(), role: memberRole })
      setMemberEmail('')
      setNotice(data.message || 'Organisation member added.')
      await loadOrganisations()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function removeMember(userId) {
    if (!window.confirm('Remove this member from the organisation?')) return
    setError('')
    setNotice('')
    try {
      await api.delete(`/organisations/${selectedId}/members/${userId}`)
      setNotice('Organisation member removed.')
      await loadOrganisations()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    }
  }

  const selectedOrg = organisation?.organisation
  const selectedMembership = organisation?.membership
  const canManageMembers = selectedMembership?.role === 'owner'
  const list = memberships.map((membership) => ({ membership, organisation: membership.organisation || membership }))

  return (
    <section className="mx-auto min-h-[70vh] max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700" to="/dashboard"><ArrowLeft aria-hidden="true" size={16} />My ShareGrid</Link>
      <div className="mt-8"><p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Account</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">Organisations</h1><p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Manage organisation membership and submit private verification documents.</p></div>

      {error && <p aria-live="polite" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</p>}
      {notice && <p aria-live="polite" className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-900">{notice}</p>}

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(240px,0.65fr)_minmax(0,1.35fr)]">
        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-950">Your organisations</h2>
            {isLoading ? <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle aria-hidden="true" className="animate-spin" size={16} />Loading…</div> : list.length ? <ul className="mt-3 space-y-2">{list.map(({ membership, organisation: item }) => {
              const id = item._id || item.id
              return <li key={id}><button aria-pressed={selectedId === id} className={`w-full rounded-xl border p-3 text-left ${selectedId === id ? 'border-green-700 bg-green-50' : 'border-slate-200 hover:bg-slate-50'}`} onClick={() => setSelectedId(id)} type="button"><span className="block font-semibold text-slate-950">{item.name}</span><span className="mt-1 block text-xs capitalize text-slate-500">{item.verificationStatus || item.status || 'pending'} · {membership.role || 'member'}</span></button></li>
            })}</ul> : <p className="mt-3 text-sm text-slate-600">No organisation memberships yet.</p>}
          </section>

          <form className="rounded-2xl border border-slate-200 bg-white p-5" onSubmit={createOrganisation}>
            <div className="flex items-center gap-2"><Building2 aria-hidden="true" className="text-green-700" size={18} /><h2 className="font-semibold text-slate-950">Create organisation</h2></div>
            <label className="mt-4 block text-sm font-semibold text-slate-800" htmlFor="organisationName">Organisation name</label>
            <input className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" id="organisationName" maxLength={150} onChange={(event) => setName(event.target.value)} required value={name} />
            <label className="mt-4 block text-sm font-semibold text-slate-800" htmlFor="organisationType">Type</label>
            <select className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm" id="organisationType" onChange={(event) => setType(event.target.value)} value={type}>{organisationTypes.map((option) => <option className="capitalize" key={option} value={option}>{option}</option>)}</select>
            <label className="mt-4 block text-sm font-semibold text-slate-800" htmlFor="registrationNumber">Registration number <span className="font-normal text-slate-500">(optional)</span></label>
            <input className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" id="registrationNumber" onChange={(event) => setRegistrationNumber(event.target.value)} value={registrationNumber} />
            <button className="mt-5 w-full rounded-full bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={isSubmitting} type="submit">{isSubmitting ? 'Saving…' : 'Create organisation'}</button>
          </form>
        </aside>

        <div className="space-y-5">
          {selectedOrg ? <>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-slate-950">{selectedOrg.name}</h2><p className="mt-1 text-sm capitalize text-slate-600">{selectedOrg.type} · {selectedOrg.verificationStatus || selectedOrg.status || 'pending review'}</p></div><ShieldCheck aria-hidden="true" className="text-green-700" size={21} /></div>
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">Organisation-owned listings require an approved organisation and an authorised representative. Add registration or authorisation evidence to request review.</p>
            </section>

            <form className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" onSubmit={uploadEvidence}>
              <h2 className="font-semibold text-slate-950">Submit private evidence</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div><label className="text-sm font-semibold text-slate-800" htmlFor="evidenceKind">Evidence type</label><select className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm" id="evidenceKind" onChange={(event) => setEvidenceKind(event.target.value)} value={evidenceKind}>{evidenceKinds.map((kind) => <option key={kind} value={kind}>{kind.replaceAll('_', ' ')}</option>)}</select></div>
                <div><label className="text-sm font-semibold text-slate-800" htmlFor="evidenceFile">File</label><input accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-2 text-sm file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold" id="evidenceFile" onChange={(event) => setEvidenceFile(event.target.files?.[0] || null)} required type="file" /></div>
              </div>
              <button className="mt-4 rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={isSubmitting || !evidenceFile} type="submit">Upload securely</button>
              <p className="mt-3 text-xs leading-5 text-slate-500">Files are stored privately and only shown to authorised reviewers.</p>
            </form>

            {canManageMembers && <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex items-center gap-2"><UserPlus aria-hidden="true" className="text-green-700" size={18} /><h2 className="font-semibold text-slate-950">Manage members</h2></div>
              <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]" onSubmit={addMember}><label className="sr-only" htmlFor="memberEmail">Member email</label><input className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" id="memberEmail" onChange={(event) => setMemberEmail(event.target.value)} placeholder="Existing ShareGrid user email" required type="email" value={memberEmail} /><select className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm" onChange={(event) => setMemberRole(event.target.value)} value={memberRole}><option value="representative">Representative</option><option value="member">Member</option></select><button className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={isSubmitting} type="submit">Add member</button></form>
              {selectedOrg.members?.length > 0 && <ul className="mt-5 divide-y divide-slate-200">{selectedOrg.members.map((member) => <li className="flex items-center justify-between gap-3 py-3" key={member._id || member.user?._id || member.user?.id}><div><p className="text-sm font-semibold text-slate-900">{member.user?.name || member.name || member.email}</p><p className="text-xs capitalize text-slate-500">{member.role}</p></div><button className="text-xs font-semibold text-red-700 underline" onClick={() => removeMember(member.user?._id || member.user?.id || member.userId)} type="button">Remove</button></li>)}</ul>}
            </section>}

            {selectedOrg.evidence?.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-950">Evidence on record</h2><ul className="mt-3 space-y-2">{selectedOrg.evidence.map((item) => <li className="flex items-center gap-2 text-sm text-slate-700" key={item._id || item.id}><FileText aria-hidden="true" size={16} />{item.kind?.replaceAll('_', ' ')} · {item.originalName}</li>)}</ul></section>}
          </> : !isLoading && <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><div><Building2 aria-hidden="true" className="mx-auto text-slate-400" size={28} /><p className="mt-3 font-semibold text-slate-950">Create an organisation to get started</p><p className="mt-1 text-sm text-slate-600">After it’s created, add private registration evidence for review.</p></div></div>}
        </div>
      </div>
    </section>
  )
}

export default OrganisationsPage
