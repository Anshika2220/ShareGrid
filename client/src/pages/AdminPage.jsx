import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Building2, ClipboardCheck, LoaderCircle, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, getApiErrorMessage } from '../services/api.js'

const tabs = [
  { id: 'verifications', label: 'Ownership reviews', endpoint: '/admin/verifications', resultKey: 'items', detailPath: '/admin/verifications' },
  { id: 'organisations', label: 'Organisations', endpoint: '/admin/organisations/queue', resultKey: 'items', detailPath: '/admin/organisations' },
  { id: 'incidents', label: 'Incidents', endpoint: '/admin/incidents', resultKey: 'items' },
  { id: 'reviews', label: 'Reported reviews', endpoint: '/admin/reviews', resultKey: 'items' },
  { id: 'users', label: 'Users', endpoint: '/admin/users', resultKey: 'users' },
  { id: 'bookings', label: 'Bookings', endpoint: '/admin/bookings', resultKey: 'items' },
  { id: 'policies', label: 'Policies', endpoint: '/admin/policies' },
  { id: 'audit', label: 'Audit log', endpoint: '/admin/audit-logs', resultKey: 'items' },
  { id: 'refund', label: 'Payment refund' },
]

const decisionOptions = [
  ['under_review', 'Mark under review'],
  ['approve', 'Approve'],
  ['reject', 'Reject'],
  ['request_evidence', 'Request more evidence'],
]

const fieldClass = 'mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-black focus:outline-none focus:ring-4 focus:ring-slate-100'

function recordId(record) {
  return record?._id || record?.id || ''
}

function relatedId(value) {
  return value?._id || value?.id || value || ''
}

function AdminPage() {
  const [activeTab, setActiveTab] = useState('verifications')
  const [records, setRecords] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [policyData, setPolicyData] = useState(null)
  const [policySelection, setPolicySelection] = useState('')
  const [policyValue, setPolicyValue] = useState('')
  const [decision, setDecision] = useState('under_review')
  const [incidentStatus, setIncidentStatus] = useState('under_review')
  const [appealDecision, setAppealDecision] = useState('uphold')
  const [moderationStatus, setModerationStatus] = useState('hidden')
  const [accountStatus, setAccountStatus] = useState('suspended')
  const [depositDecision, setDepositDecision] = useState('none')
  const [depositDeduction, setDepositDeduction] = useState('')
  const [honorAdjustment, setHonorAdjustment] = useState('0')
  const [reason, setReason] = useState('')
  const [paymentId, setPaymentId] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const activeConfig = tabs.find((tab) => tab.id === activeTab)
  const policyEntries = useMemo(() => {
    if (!policyData?.defaults) return []
    return Object.keys(policyData.defaults).flatMap((key) => {
      const saved = policyData.policies.filter((policy) => policy.key === key)
      return (saved.length ? saved : [{ key, category: '*', value: policyData.defaults[key] }])
        .map((policy) => ({ ...policy, id: `${policy.key}:${policy.category || '*'}` }))
    })
  }, [policyData])
  const selectedPolicy = policyEntries.find((entry) => entry.id === policySelection)

  useEffect(() => {
    if (!activeConfig.endpoint) return undefined

    const controller = new AbortController()
    api.get(activeConfig.endpoint, { signal: controller.signal })
      .then(({ data }) => {
        const payload = data.data
        if (activeTab === 'policies') {
          if (!payload.defaults || !Array.isArray(payload.policies)) throw new Error('The API returned an invalid policy response.')
          setPolicyData(payload)
          setRecords([])
          return
        }
        const rows = payload[activeConfig.resultKey]
        if (!Array.isArray(rows)) throw new Error('The API returned an invalid admin list response.')
        setRecords(rows)
        setDetail(null)
        setSelectedId((current) => rows.some((row) => recordId(row) === current) ? current : recordId(rows[0]))
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(requestError))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [activeConfig, activeTab, refreshKey])

  useEffect(() => {
    if (!activeConfig.detailPath || !selectedId) return undefined
    const controller = new AbortController()
    api.get(`${activeConfig.detailPath}/${selectedId}`, { signal: controller.signal })
      .then(({ data }) => setDetail(data.data))
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(requestError))
      })
    return () => controller.abort()
  }, [activeConfig.detailPath, selectedId, refreshKey])

  function chooseTab(tabId) {
    const config = tabs.find((tab) => tab.id === tabId)
    setActiveTab(tabId)
    setSelectedId('')
    setDetail(null)
    setRecords([])
    setIsLoading(Boolean(config?.endpoint))
    setReason('')
    setError('')
    setNotice('')
  }

  function chooseRecord(id) {
    setSelectedId(id)
    setDetail(null)
  }

  function refreshCurrentData() {
    setError('')
    setNotice('')
    setIsLoading(Boolean(activeConfig.endpoint))
    setRefreshKey((current) => current + 1)
  }

  async function submitAction(path, body) {
    setError('')
    setNotice('')
    setIsLoading(true)
    setIsSubmitting(true)
    try {
      const { data } = await api.patch(path, body)
      setNotice(data.message || 'The change was saved.')
      setReason('')
      setRefreshKey((current) => current + 1)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function downloadEvidence(kind, evidence) {
    setError('')
    try {
      const { data } = await api.get(`/${kind}/evidence/${recordId(evidence)}`, { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = evidence.originalName || 'private-evidence'
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    }
  }

  async function savePolicy(event) {
    event.preventDefault()
    if (!selectedPolicy) return
    let value
    try {
      value = JSON.parse(policyValue)
    } catch {
      setError('Policy value must be valid JSON.')
      return
    }
    setError('')
    setNotice('')
    setIsSubmitting(true)
    try {
      const { data } = await api.patch('/admin/policies', {
        key: selectedPolicy.key,
        category: selectedPolicy.category || '*',
        value,
      })
      setNotice(data.message || 'Policy saved.')
      setIsLoading(true)
      setRefreshKey((current) => current + 1)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function refundPayment(event) {
    event.preventDefault()
    if (!window.confirm('Submit this payment refund? This action may contact the payment provider.')) return
    setError('')
    setNotice('')
    setIsSubmitting(true)
    try {
      const { data } = await api.post(`/payments/${encodeURIComponent(paymentId.trim())}/refund`, { reason: refundReason.trim() })
      setNotice(data.message || 'Refund requested.')
      setPaymentId('')
      setRefundReason('')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  function renderDecisionForm(endpoint, options = decisionOptions) {
    return <form className="mt-5 space-y-4 border-t border-slate-200 pt-5" onSubmit={(event) => {
      event.preventDefault()
      void submitAction(endpoint, { decision, reason: reason.trim() })
    }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-800">Decision<select className={fieldClass} onChange={(event) => setDecision(event.target.value)} value={decision}>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-sm font-semibold text-slate-800">Reason<textarea className={fieldClass} maxLength={2000} minLength={5} onChange={(event) => setReason(event.target.value)} required rows={3} value={reason} /></label>
      </div>
      <button className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50" disabled={isSubmitting || reason.trim().length < 5} type="submit">{isSubmitting ? 'Saving…' : 'Save decision'}</button>
    </form>
  }

  function renderQueuePanel() {
    if (activeTab === 'verifications' || activeTab === 'organisations') {
      const isOrganisation = activeTab === 'organisations'
      const item = isOrganisation ? detail?.organisation : detail?.verification
      const evidence = isOrganisation ? detail?.evidence : item?.evidence || []
      const applicant = isOrganisation ? item?.createdBy : item?.applicant
      return <div className="grid gap-5 lg:grid-cols-[minmax(240px,0.65fr)_minmax(0,1.35fr)]">
        <RecordList records={records} selectedId={selectedId} onSelect={chooseRecord} emptyText="No pending items." getTitle={(row) => isOrganisation ? row.name : row.resource?.title || 'Resource verification'} getDescription={(row) => `${row.verificationStatus || row.status || 'pending'} · ${row.createdBy?.email || row.applicant?.email || ''}`} />
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          {!selectedId ? <EmptyState text="Select a queue item to review." /> : !detail ? <LoadingState /> : <>
            <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-green-50 text-green-800">{isOrganisation ? <Building2 size={20} /> : <ClipboardCheck size={20} />}</span><div><h2 className="text-xl font-semibold text-slate-950">{isOrganisation ? item?.name : item?.resource?.title}</h2><p className="mt-1 text-sm text-slate-600">{applicant?.name || applicant?.email || 'Applicant'} · {applicant?.email || ''}</p></div></div>
            <dl className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <Info label="Current status" value={isOrganisation ? item?.verificationStatus : item?.status} />
              <Info label="Submitted" value={item?.createdAt ? new Date(item.createdAt).toLocaleString() : '—'} />
              <Info label="Review reason" value={item?.decisionReason || 'No previous decision'} />
              {!isOrganisation && <Info label="Verification route" value={item?.route} />}
              {isOrganisation && <Info label="Registration number" value={item?.registrationNumber || 'Not supplied'} />}
            </dl>
            <h3 className="mt-6 font-semibold text-slate-950">Private evidence</h3>
            {evidence.length ? <ul className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200">{evidence.map((file) => <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm" key={recordId(file)}><span><strong className="text-slate-900">{file.originalName || file.kind || 'Evidence file'}</strong><span className="ml-2 text-slate-500">{file.kind || file.mimeType || ''}</span></span><button className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100" onClick={() => downloadEvidence(isOrganisation ? 'organisations' : 'verifications', file)} type="button">Download</button></li>)}</ul> : <p className="mt-2 text-sm text-slate-600">No evidence files submitted.</p>}
            {renderDecisionForm(`${isOrganisation ? '/admin/organisations' : '/admin/verifications'}/${selectedId}/decision`)}
          </>}
        </section>
      </div>
    }

    if (activeTab === 'incidents') {
      const incident = records.find((row) => recordId(row) === selectedId)
      return <div className="grid gap-5 lg:grid-cols-[minmax(240px,0.65fr)_minmax(0,1.35fr)]">
        <RecordList records={records} selectedId={selectedId} onSelect={setSelectedId} emptyText="No incidents have been reported." getTitle={(row) => `${row.type?.replaceAll('_', ' ') || 'Incident'} · ${row.status || 'open'}`} getDescription={(row) => row.description || recordId(row)} />
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          {!incident ? <EmptyState text="Select an incident to review." /> : <>
            <h2 className="text-xl font-semibold capitalize text-slate-950">{incident.type?.replaceAll('_', ' ')} incident</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{incident.description}</p>
            <dl className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <Info label="Status" value={incident.status} />
              <Info label="Appeal" value={incident.appealStatus || 'none'} />
              <Info label="Booking" value={relatedId(incident.booking)} />
              <Info label="Decision reason" value={incident.decisionReason || 'Not decided'} />
            </dl>
            {incident.appealStatus === 'open' ? <form className="mt-5 space-y-4 border-t border-slate-200 pt-5" onSubmit={(event) => { event.preventDefault(); void submitAction(`/admin/incidents/${selectedId}/appeal`, { decision: appealDecision, reason: reason.trim() }) }}>
              <label className="block text-sm font-semibold text-slate-800">Appeal decision<select className={fieldClass} onChange={(event) => setAppealDecision(event.target.value)} value={appealDecision}><option value="uphold">Uphold original decision</option><option value="reverse">Reverse original decision</option></select></label>
              <label className="block text-sm font-semibold text-slate-800">Reason<textarea className={fieldClass} maxLength={2000} minLength={5} onChange={(event) => setReason(event.target.value)} required rows={3} value={reason} /></label>
              <button className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={isSubmitting || reason.trim().length < 5} type="submit">Save appeal decision</button>
            </form> : ['resolved', 'dismissed'].includes(incident.status) ? <p className="mt-5 border-t border-slate-200 pt-5 text-sm text-slate-600">This incident has a final decision. Further changes are available only through an open appeal.</p> : <form className="mt-5 space-y-4 border-t border-slate-200 pt-5" onSubmit={(event) => {
              event.preventDefault()
              if ((depositDecision !== 'none' || incidentStatus === 'resolved') && !window.confirm('Save this incident decision? It may resolve a deposit or affect a member’s Honor Score.')) return
              const body = { status: incidentStatus, reason: reason.trim(), depositDecision, honorAdjustment: Number(honorAdjustment) }
              if (depositDecision === 'deduct' && depositDeduction) body.depositDeduction = Number(depositDeduction)
              void submitAction(`/admin/incidents/${selectedId}/decision`, body)
            }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-800">Incident outcome<select className={fieldClass} onChange={(event) => setIncidentStatus(event.target.value)} value={incidentStatus}><option value="under_review">Under review</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select></label>
                <label className="text-sm font-semibold text-slate-800">Deposit decision<select className={fieldClass} onChange={(event) => setDepositDecision(event.target.value)} value={depositDecision}><option value="none">No deposit action</option><option value="refund">Refund remaining deposit</option><option value="deduct">Deduct from deposit</option></select></label>
                {depositDecision === 'deduct' && <label className="text-sm font-semibold text-slate-800">Deduction amount (INR)<input className={fieldClass} min="0.01" onChange={(event) => setDepositDeduction(event.target.value)} required step="0.01" type="number" value={depositDeduction} /></label>}
                <label className="text-sm font-semibold text-slate-800">Honor Score adjustment<input className={fieldClass} max="100" min="-100" onChange={(event) => setHonorAdjustment(event.target.value)} step="1" type="number" value={honorAdjustment} /></label>
              </div>
              <label className="block text-sm font-semibold text-slate-800">Reason<textarea className={fieldClass} maxLength={2000} minLength={5} onChange={(event) => setReason(event.target.value)} required rows={3} value={reason} /></label>
              <button className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={isSubmitting || reason.trim().length < 5} type="submit">{isSubmitting ? 'Saving…' : 'Save incident decision'}</button>
            </form>}
          </>}
        </section>
      </div>
    }

    if (activeTab === 'reviews') return <RecordList records={records} emptyText="No reported reviews." getTitle={(row) => `${row.rating}/5 · ${row.reportReason || 'Reported review'}`} getDescription={(row) => row.text || 'No review text'} renderActions={(row) => <div className="flex flex-wrap items-center gap-2"><select aria-label="Review moderation status" className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs" onChange={(event) => setModerationStatus(event.target.value)} value={moderationStatus}><option value="hidden">Hide review</option><option value="visible">Keep visible</option></select><input aria-label="Review moderation reason" className="min-w-40 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs" maxLength={1000} onChange={(event) => setReason(event.target.value)} placeholder="Reason (min 5 characters)" value={reason} /><button className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" disabled={isSubmitting || reason.trim().length < 5} onClick={() => void submitAction(`/admin/reviews/${recordId(row)}`, { moderationStatus, reason: reason.trim() })} type="button">Moderate</button></div>} />

    if (activeTab === 'users') return <RecordList records={records} emptyText="No user accounts." getTitle={(row) => row.name || row.email} getDescription={(row) => `${row.email} · ${row.status} · ${row.roles?.join(', ') || 'user'} · Honor ${row.honorScore ?? 0}`} renderActions={(row) => <div className="grid gap-2 sm:grid-cols-[auto_minmax(180px,1fr)_auto]"><select aria-label={`New status for ${row.email}`} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs" onChange={(event) => setAccountStatus(event.target.value)} value={accountStatus}><option value="active">Active</option><option value="suspended">Suspended</option><option value="inactive">Inactive</option></select><input aria-label="Account status change reason" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs" maxLength={1000} onChange={(event) => setReason(event.target.value)} placeholder="Reason (min 5 characters)" value={reason} /><button className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" disabled={isSubmitting || reason.trim().length < 5} onClick={() => {
      if (['suspended', 'inactive'].includes(accountStatus) && !window.confirm(`Set ${row.email} to ${accountStatus}? Their current sessions will be revoked.`)) return
      void submitAction(`/admin/users/${recordId(row)}/status`, { status: accountStatus, reason: reason.trim() })
    }} type="button">Update status</button></div>} />

    if (activeTab === 'bookings') return <RecordList records={records} emptyText="No recent bookings." getTitle={(row) => row.resource?.title || `Booking ${recordId(row)}`} getDescription={(row) => `${row.status} · ${row.paymentStatus || 'payment pending'} · ${row.start ? new Date(row.start).toLocaleDateString() : ''} – ${row.end ? new Date(row.end).toLocaleDateString() : ''}`} />

    if (activeTab === 'audit') return <RecordList records={records} emptyText="No audit events." getTitle={(row) => row.action || 'Audit event'} getDescription={(row) => `${row.actor?.name || row.actor?.email || 'System'} · ${row.reason || row.targetType || ''} · ${row.createdAt ? new Date(row.createdAt).toLocaleString() : ''}`} />

    if (activeTab === 'policies') return <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      {!policyData ? <LoadingState /> : <form className="space-y-5" onSubmit={savePolicy}>
        <div><h2 className="text-xl font-semibold text-slate-950">Platform policies</h2><p className="mt-1 text-sm text-slate-600">Edit the active policy as JSON. The API validates each policy before saving.</p></div>
        <label className="block max-w-xl text-sm font-semibold text-slate-800">Policy and category<select className={fieldClass} onChange={(event) => {
          const entry = policyEntries.find((item) => item.id === event.target.value)
          setPolicySelection(event.target.value)
          setPolicyValue(entry ? JSON.stringify(entry.value, null, 2) : '')
          setError('')
        }} value={policySelection}><option value="">Select a policy</option>{policyEntries.map((entry) => <option key={entry.id} value={entry.id}>{entry.key} · {entry.category || '*'}</option>)}</select></label>
        <label className="block text-sm font-semibold text-slate-800">Policy value<textarea className={`${fieldClass} min-h-72 font-mono text-xs`} disabled={!selectedPolicy} onChange={(event) => setPolicyValue(event.target.value)} spellCheck="false" value={policyValue} /></label>
        <button className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={isSubmitting || !selectedPolicy} type="submit">{isSubmitting ? 'Saving…' : 'Save policy'}</button>
      </form>}
    </section>

    return <form className="max-w-2xl rounded-2xl border border-amber-200 bg-white p-5 sm:p-7" onSubmit={refundPayment}>
      <div className="flex items-start gap-3"><AlertTriangle aria-hidden="true" className="mt-0.5 text-amber-700" size={20} /><div><h2 className="font-semibold text-slate-950">Refund a captured payment</h2><p className="mt-1 text-sm leading-6 text-slate-600">Enter the payment ID from the payment record. Refunds may contact the payment provider and can cancel the associated booking.</p></div></div>
      <label className="mt-5 block text-sm font-semibold text-slate-800">Payment ID<input className={fieldClass} onChange={(event) => setPaymentId(event.target.value)} pattern="[a-fA-F0-9]{24}" required title="Enter the 24-character payment ID." value={paymentId} /></label>
      <label className="mt-4 block text-sm font-semibold text-slate-800">Reason<textarea className={fieldClass} maxLength={1000} minLength={5} onChange={(event) => setRefundReason(event.target.value)} required rows={3} value={refundReason} /></label>
      <button className="mt-5 rounded-full bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50" disabled={isSubmitting || paymentId.trim().length === 0 || refundReason.trim().length < 5} type="submit">{isSubmitting ? 'Submitting…' : 'Submit refund'}</button>
    </form>
  }

  return (
    <section className="mx-auto min-h-[70vh] max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-black" to="/dashboard"><ArrowLeft aria-hidden="true" size={16} />My ShareGrid</Link>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-green-800">Administrator tools</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">Admin workspace</h1><p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Review submissions and manage platform operations. Decisions and moderation actions are recorded by the API.</p></div><button className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-white disabled:opacity-50" disabled={isLoading || !activeConfig.endpoint} onClick={refreshCurrentData} type="button"><RefreshCw aria-hidden="true" size={15} />Refresh</button></div>

      <div className="mt-7 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Admin sections">{tabs.map((tab) => <button aria-selected={activeTab === tab.id} className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold ${activeTab === tab.id ? 'bg-slate-950 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`} key={tab.id} onClick={() => chooseTab(tab.id)} role="tab" type="button">{tab.label}</button>)}</div>
      {error && <p aria-live="polite" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</p>}
      {notice && <p aria-live="polite" className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-900">{notice}</p>}
      <div className="mt-5">{isLoading ? <LoadingState /> : renderQueuePanel()}</div>
    </section>
  )
}

function RecordList({ records, selectedId, onSelect, emptyText, getTitle, getDescription, renderActions }) {
  if (!records.length) return <EmptyState text={emptyText} />
  return <ul className="space-y-3">{records.map((record) => {
    const id = recordId(record)
    return <li className={`rounded-2xl border bg-white p-4 ${id === selectedId ? 'border-green-700 ring-1 ring-green-700' : 'border-slate-200'}`} key={id}>
      {onSelect ? <button className="w-full text-left" onClick={() => onSelect(id)} type="button"><span className="block font-semibold text-slate-950">{getTitle(record)}</span><span className="mt-1 block line-clamp-2 text-sm leading-5 text-slate-600">{getDescription(record)}</span></button> : <div><span className="block font-semibold text-slate-950">{getTitle(record)}</span><span className="mt-1 block line-clamp-2 text-sm leading-5 text-slate-600">{getDescription(record)}</span></div>}
      {renderActions && <div className="mt-3 border-t border-slate-100 pt-3">{renderActions(record)}</div>}
    </li>
  })}</ul>
}

function Info({ label, value }) {
  return <div className="min-w-0"><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium capitalize text-slate-900">{value || '—'}</dd></div>
}

function EmptyState({ text }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">{text}</div>
}

function LoadingState() {
  return <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle aria-hidden="true" className="animate-spin" size={18} />Loading admin data…</div>
}

export default AdminPage
