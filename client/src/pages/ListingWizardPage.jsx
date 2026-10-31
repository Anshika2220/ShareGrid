import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, BadgeCheck, Check, FileImage, FileText, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import CloudinaryImageUploader from '../components/CloudinaryImageUploader.jsx'
import { api, getApiErrorMessage } from '../services/api.js'

const steps = ['Basics', 'Photos', 'Pricing', 'Availability', 'Verification', 'Review']
const categories = [
  'Camera & photography',
  'Audio & music',
  'Computers & technology',
  'Tools & equipment',
  'Spaces & facilities',
  'Sports & outdoors',
  'Other',
]
const invoiceQuestions = [
  ['invoiceOwner', 'Is the invoice in your name or your organisation’s name?'],
  ['possessionDuration', 'How long have you had this resource in your possession?'],
  ['resourceUse', 'What do you use this resource for?'],
  ['possessionProof', 'Can you provide fresh possession evidence when requested?'],
]
const noInvoiceQuestions = [
  ['purchaseSource', 'Where did you obtain this resource?'],
  ['possessionDuration', 'How long has it been in your possession?'],
  ['ownershipDetails', 'Why are you authorised to list this resource?'],
  ['resourceUse', 'What do you use this resource for?'],
  ['identifyingMarks', 'Describe identifying marks or distinguishing features.'],
  ['serialLocation', 'Where can model and serial details be found?'],
  ['powerOn', 'Can you show the resource powering on, if applicable?'],
  ['supportingProof', 'What other supporting proof can you provide?'],
  ['freshEvidence', 'Can you provide fresh, multi-angle possession evidence?'],
]

const initialValues = {
  ownerType: 'individual',
  organisationId: '',
  title: '',
  category: '',
  brand: '',
  model: '',
  description: '',
  condition: '',
  conditionDetails: '',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  price: '',
  priceUnit: 'daily',
  deposit: '',
  depositTerms: '',
  availableFrom: '',
  availableUntil: '',
  verificationRoute: '',
  ownershipDeclaration: false,
  invoiceOwner: '',
  possessionDuration: '',
  resourceUse: '',
  possessionProof: '',
  purchaseSource: '',
  ownershipDetails: '',
  identifyingMarks: '',
  serialLocation: '',
  powerOn: '',
  supportingProof: '',
  freshEvidence: '',
  serialNumber: '',
  accessoriesText: '',
  usageInstructions: '',
  pickupInstructions: '',
}

const fieldClass = 'mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-black focus:ring-4 focus:ring-slate-100'

function splitList(value) {
  return value.split(/[\n,]/).map((part) => part.trim()).filter(Boolean)
}

function ListingWizardPage() {
  const [step, setStep] = useState(0)
  const [values, setValues] = useState(initialValues)
  const [imageUrls, setImageUrls] = useState([])
  const [invoiceFile, setInvoiceFile] = useState(null)
  const [possessionFile, setPossessionFile] = useState(null)
  const [possessionCode, setPossessionCode] = useState('')
  const [possessionCodeExpiresAt, setPossessionCodeExpiresAt] = useState('')
  const [organisations, setOrganisations] = useState([])
  const [createdResource, setCreatedResource] = useState(null)
  const [verification, setVerification] = useState(null)
  const [invoiceUploaded, setInvoiceUploaded] = useState(false)
  const [possessionProofUploaded, setPossessionProofUploaded] = useState(false)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    api.get('/organisations/mine', { signal: controller.signal })
      .then(({ data }) => {
        setOrganisations(data.data.items.map((item) => item.organisation || item).filter(Boolean))
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setMessage(`Organisation options could not be loaded: ${getApiErrorMessage(requestError)}`)
      })
    return () => controller.abort()
  }, [])

  function setField(name, value) {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
    setMessage('')
  }

  function validateStep() {
    const next = {}
    const required = (name, label) => {
      if (!String(values[name] ?? '').trim()) next[name] = `${label} is required.`
    }

    if (step === 0) {
      if (values.ownerType === 'organisation') required('organisationId', 'Approved organisation')
      required('title', 'Resource title')
      required('category', 'Category')
      required('brand', 'Brand')
      required('model', 'Model')
      required('description', 'Description')
      required('condition', 'Condition')
      required('address', 'Street address')
      required('city', 'City')
    }
    if (step === 1) {
      if (imageUrls.length < 4 || imageUrls.length > 20) next.images = 'Upload between 4 and 20 photos.'
    }
    if (step === 2) {
      required('price', 'Rental price')
      if (!Number.isFinite(Number(values.price)) || Number(values.price) <= 0) next.price = 'Enter a price greater than zero.'
      if (values.deposit && (!Number.isFinite(Number(values.deposit)) || Number(values.deposit) < 0)) next.deposit = 'Enter a valid non-negative deposit.'
      if (Number(values.deposit) > 0) required('depositTerms', 'Deposit refund conditions')
    }
    if (step === 3) {
      required('availableFrom', 'Availability start date')
      required('availableUntil', 'Availability end date')
      if (values.availableFrom && values.availableUntil && values.availableUntil <= values.availableFrom) next.availableUntil = 'Availability end must be after the start.'
    }
    if (step === 4) {
      required('verificationRoute', 'Verification route')
      if (values.verificationRoute === 'invoice') {
        invoiceQuestions.forEach(([name, label]) => required(name, label))
        if (!invoiceFile && !invoiceUploaded) next.invoiceFile = 'Choose your invoice or purchase bill.'
        if (invoiceFile && invoiceFile.size > 10 * 1024 * 1024) next.invoiceFile = 'Evidence files must be 10 MB or smaller.'
      }
      if (values.verificationRoute === 'no_invoice') {
        noInvoiceQuestions.forEach(([name, label]) => required(name, label))
        required('serialNumber', 'Serial number')
        if (!possessionFile && !possessionProofUploaded) next.possessionFile = 'Choose a JPEG, PNG, or WebP possession photo.'
        if (possessionFile && !['image/jpeg', 'image/png', 'image/webp'].includes(possessionFile.type)) next.possessionFile = 'Possession proof must be JPEG, PNG, or WebP.'
        if (possessionFile && possessionFile.size > 10 * 1024 * 1024) next.possessionFile = 'Evidence files must be 10 MB or smaller.'
      }
      if (values.verificationRoute) {
        if (!values.ownershipDeclaration) next.ownershipDeclaration = 'Confirm the ownership declaration.'
      }
    }

    setErrors(next)
    if (Object.keys(next).length) {
      setMessage('Review the highlighted fields before continuing.')
      return false
    }
    setMessage('')
    return true
  }

  function updateFile(event, setter, fieldName) {
    const file = event.target.files?.[0] || null
    setter(file)
    setErrors((current) => {
      const next = { ...current }
      delete next[fieldName]
      return next
    })
    setMessage('')
  }

  function input(name, label, options = {}) {
    return (
      <div key={name}>
        <label className="text-sm font-semibold text-slate-800" htmlFor={name}>{label}{options.required && <span className="text-red-700"> *</span>}</label>
        {options.hint && <p className="mt-1 text-xs leading-5 text-slate-500">{options.hint}</p>}
        <input
          className={`${fieldClass} ${errors[name] ? 'border-red-400' : ''}`}
          id={name}
          maxLength={options.maxLength}
          min={options.min}
          name={name}
          onChange={(event) => setField(name, event.target.value)}
          required={options.required}
          type={options.type || 'text'}
          value={values[name]}
        />
        {errors[name] && <p className="mt-1 text-sm text-red-700">{errors[name]}</p>}
      </div>
    )
  }

  function textArea(name, label, options = {}) {
    return (
      <div className={options.className || ''} key={name}>
        <label className="text-sm font-semibold text-slate-800" htmlFor={name}>{label}{options.required && <span className="text-red-700"> *</span>}</label>
        {options.hint && <p className="mt-1 text-xs leading-5 text-slate-500">{options.hint}</p>}
        <textarea
          className={`${fieldClass} min-h-28 resize-y ${errors[name] ? 'border-red-400' : ''}`}
          id={name}
          maxLength={options.maxLength}
          minLength={options.minLength}
          onChange={(event) => setField(name, event.target.value)}
          required={options.required}
          value={values[name]}
        />
        {errors[name] && <p className="mt-1 text-sm text-red-700">{errors[name]}</p>}
      </div>
    )
  }

  async function createOrUpdateVerification() {
    let resource = createdResource
    let currentVerification = verification

    if (!resource) {
      const availability = {
        availableFrom: new Date(`${values.availableFrom}T00:00:00`).toISOString(),
        availableUntil: new Date(`${values.availableUntil}T23:59:59`).toISOString(),
        blockedDates: [],
      }
      const depositAmount = Number(values.deposit || 0)
      const payload = {
        title: values.title.trim(),
        category: values.category,
        brand: values.brand.trim(),
        model: values.model.trim(),
        description: values.description.trim(),
        images: imageUrls,
        condition: values.condition,
        ...(values.conditionDetails.trim() ? { conditionDetails: values.conditionDetails.trim() } : {}),
        price: Number(values.price),
        pricingUnit: values.priceUnit === 'daily' ? 'daily' : 'hourly',
        deposit: {
          required: depositAmount > 0,
          amount: depositAmount,
          ...(values.depositTerms.trim() ? { refundConditions: values.depositTerms.trim() } : {}),
        },
        location: {
          address: values.address.trim(),
          city: values.city.trim(),
          ...(values.state.trim() ? { state: values.state.trim() } : {}),
          ...(values.postalCode.trim() ? { postalCode: values.postalCode.trim() } : {}),
        },
        availability,
        ...(splitList(values.accessoriesText).length ? { accessories: splitList(values.accessoriesText) } : {}),
        ...(values.usageInstructions.trim() ? { usageInstructions: values.usageInstructions.trim() } : {}),
        ...(values.pickupInstructions.trim() ? { pickupInstructions: values.pickupInstructions.trim() } : {}),
        ownershipType: values.ownerType,
        ...(values.ownerType === 'organisation' ? { organisation: values.organisationId } : {}),
      }
      const { data } = await api.post('/resources', payload)
      resource = data.data.resource
      setCreatedResource(resource)
    }

    if (!currentVerification) {
      const answers = values.verificationRoute === 'invoice'
        ? Object.fromEntries(invoiceQuestions.map(([name]) => [name, values[name].trim()]))
        : Object.fromEntries([...noInvoiceQuestions, ['serialNumber', 'Serial number']].map(([name]) => [name, values[name].trim()]))
      const { data } = await api.post('/verifications', {
        resourceId: resource._id || resource.id,
        route: values.verificationRoute,
        answers,
      })
      currentVerification = data.data.verification
      setVerification(currentVerification)
    }

    const verificationId = currentVerification?._id || currentVerification?.id
    if (values.verificationRoute === 'invoice' && !invoiceUploaded) {
      const body = new FormData()
      body.append('file', invoiceFile)
      body.append('kind', 'invoice')
      await api.post(`/verifications/${verificationId}/evidence`, body)
      setInvoiceUploaded(true)
      return
    }

    if (values.verificationRoute === 'no_invoice' && !possessionProofUploaded) {
      let code = possessionCode
      if (!code || (possessionCodeExpiresAt && new Date(possessionCodeExpiresAt).getTime() <= Date.now())) {
        const { data } = await api.post(`/verifications/${verificationId}/possession-challenge`)
        code = data.data.code
        setPossessionCode(code)
        setPossessionCodeExpiresAt(data.data.expiresAt)
        setMessage('A one-time possession code was generated. Write it on paper, include it in a fresh photo, then choose that photo and submit this step again.')
        return 'challenge'
      }
      const body = new FormData()
      body.append('file', possessionFile)
      body.append('code', code)
      await api.post(`/verifications/${verificationId}/possession-proof`, body)
      setPossessionProofUploaded(true)
      return 'possession-proof'
    }

    return 'evidence'
  }

  async function submitListing() {
    setMessage('')
    setIsSubmitting(true)
    try {
      const progress = await createOrUpdateVerification()
      if (progress === 'challenge') return
      if (progress === 'possession-proof') {
        setMessage('Possession proof uploaded. Your listing is saved as a draft while verification is reviewed.')
      } else {
        setMessage('Your listing and verification evidence have been submitted. The listing remains a draft until reviewed.')
      }
    } catch (requestError) {
      setMessage(getApiErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  const verificationStatus = verification?.status || 'Not submitted'
  const organisationOptions = organisations.filter((organisation) => organisation.verificationStatus === 'approved' || organisation.status === 'active')
  const maskedSerial = values.serialNumber.length > 4
    ? `${values.serialNumber.slice(0, 2)}••••${values.serialNumber.slice(-2)}`
    : '••••'

  return (
    <section className="mx-auto min-h-[70vh] max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700" to="/dashboard"><ArrowLeft aria-hidden="true" size={16} />Back to dashboard</Link>
      <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Share a resource</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Create a listing</h1><p className="mt-2 text-sm leading-6 text-slate-600">Add listing details and submit ownership evidence for review.</p></div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Step {step + 1} of {steps.length}</span>
      </div>

      <ol aria-label="Listing progress" className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
        {steps.map((label, index) => <li aria-current={index === step ? 'step' : undefined} className="min-w-0" key={label}><div className={`h-1.5 rounded-full ${index <= step ? 'bg-blue-700' : 'bg-slate-200'}`} /><p className={`mt-2 truncate text-xs font-semibold ${index === step ? 'text-slate-950' : 'text-slate-500'}`}>{index < step && <Check aria-hidden="true" className="mr-1 inline" size={13} />}{label}</p></li>)}
      </ol>

      <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        {step === 0 && <div>
          <h2 className="text-xl font-semibold text-slate-950">Basic information</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div><label className="text-sm font-semibold text-slate-800" htmlFor="ownerType">Listing owner</label><select className={fieldClass} id="ownerType" onChange={(event) => setField('ownerType', event.target.value)} value={values.ownerType}><option value="individual">Myself</option><option value="organisation">An organisation</option></select></div>
            {values.ownerType === 'organisation' && <div><label className="text-sm font-semibold text-slate-800" htmlFor="organisationId">Approved organisation</label><select className={fieldClass} id="organisationId" onChange={(event) => setField('organisationId', event.target.value)} value={values.organisationId}><option value="">Select organisation</option>{organisationOptions.map((organisation) => <option key={organisation._id || organisation.id} value={organisation._id || organisation.id}>{organisation.name}</option>)}</select>{organisationOptions.length === 0 && <p className="mt-1 text-xs text-amber-800">An approved organisation membership is required before listing organisational assets.</p>}{errors.organisationId && <p className="mt-1 text-sm text-red-700">{errors.organisationId}</p>}</div>}
            {input('title', 'Resource title', { required: true, maxLength: 150 })}
            <div><label className="text-sm font-semibold text-slate-800" htmlFor="category">Category <span className="text-red-700">*</span></label><select className={fieldClass} id="category" onChange={(event) => setField('category', event.target.value)} value={values.category}><option value="">Choose category</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>{errors.category && <p className="mt-1 text-sm text-red-700">{errors.category}</p>}</div>
            {input('brand', 'Brand or company', { required: true, maxLength: 100 })}
            {input('model', 'Model', { required: true, maxLength: 100 })}
            {textArea('description', 'Description', { required: true, minLength: 10, maxLength: 5000, className: 'sm:col-span-2' })}
            <div><label className="text-sm font-semibold text-slate-800" htmlFor="condition">Condition <span className="text-red-700">*</span></label><select className={fieldClass} id="condition" onChange={(event) => setField('condition', event.target.value)} value={values.condition}><option value="">Select condition</option>{[['new', 'New'], ['like_new', 'Like new'], ['good', 'Good'], ['fair', 'Fair'], ['poor', 'Poor']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{errors.condition && <p className="mt-1 text-sm text-red-700">{errors.condition}</p>}</div>
            {input('address', 'Street address', { required: true, maxLength: 300 })}
            {input('city', 'City', { required: true, maxLength: 100 })}
            {input('state', 'State / region', { maxLength: 100 })}
            {input('postalCode', 'Postal code', { maxLength: 20 })}
            {textArea('conditionDetails', 'Condition details (optional)', { maxLength: 2000, className: 'sm:col-span-2' })}
          </div>
        </div>}

        {step === 1 && <div>
          <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-800"><FileImage aria-hidden="true" size={20} /></span><div><h2 className="text-xl font-semibold text-slate-950">Resource photographs</h2><p className="mt-1 text-sm leading-6 text-slate-600">Upload 4–20 clear photos. Images are stored on Cloudinary and shown publicly with the listing.</p></div></div>
          <div className="mt-6"><CloudinaryImageUploader id="resourceImages" images={imageUrls} maximum={20} minimum={4} onChange={setImageUrls} purpose="resource" /></div>
          {errors.images && <p className="mt-2 text-sm text-red-700">{errors.images}</p>}
        </div>}

        {step === 2 && <div>
          <h2 className="text-xl font-semibold text-slate-950">Pricing and deposit</h2>
          <p className="mt-1 text-sm text-slate-600">The backend applies the permitted pricing policy and calculates transaction totals.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {input('price', 'Rental price', { required: true, type: 'number', min: '0.01' })}
            <div><label className="text-sm font-semibold text-slate-800" htmlFor="priceUnit">Pricing unit</label><select className={fieldClass} id="priceUnit" onChange={(event) => setField('priceUnit', event.target.value)} value={values.priceUnit}><option value="daily">Per day</option><option value="hourly">Per hour</option></select></div>
            {input('deposit', 'Refundable deposit (optional)', { type: 'number', min: '0' })}
            {Number(values.deposit) > 0 && textArea('depositTerms', 'Deposit refund conditions', { required: true, maxLength: 1000 })}
            {textArea('accessoriesText', 'Included accessories (optional)', { hint: 'Separate items with commas or line breaks.' })}
            {textArea('usageInstructions', 'Usage instructions (optional)', { maxLength: 3000 })}
            {textArea('pickupInstructions', 'Pickup instructions (optional)', { maxLength: 1000 })}
          </div>
          {errors.price && <p className="mt-2 text-sm text-red-700">{errors.price}</p>}{errors.deposit && <p className="mt-2 text-sm text-red-700">{errors.deposit}</p>}{errors.depositTerms && <p className="mt-2 text-sm text-red-700">{errors.depositTerms}</p>}
        </div>}

        {step === 3 && <div>
          <h2 className="text-xl font-semibold text-slate-950">Availability</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Set your initial availability window. Existing reservations and booking conflicts are checked by the backend.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">{input('availableFrom', 'Available from', { required: true, type: 'date' })}{input('availableUntil', 'Available until', { required: true, type: 'date' })}</div>
          {errors.availableFrom && <p className="mt-2 text-sm text-red-700">{errors.availableFrom}</p>}{errors.availableUntil && <p className="mt-2 text-sm text-red-700">{errors.availableUntil}</p>}
        </div>}

        {step === 4 && <div>
          <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-green-50 text-green-800"><ShieldCheck aria-hidden="true" size={20} /></span><div><h2 className="text-xl font-semibold text-slate-950">Ownership verification</h2><p className="mt-1 text-sm leading-6 text-slate-600">Choose one route and submit private evidence. The listing remains a draft until the review is approved.</p></div></div>
          <fieldset className="mt-6"><legend className="text-sm font-semibold text-slate-800">Do you have the purchase bill or invoice?</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{[['invoice', 'Yes, I have an invoice'], ['no_invoice', 'No, I do not have an invoice']].map(([value, label]) => <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${values.verificationRoute === value ? 'border-green-700 bg-green-50' : 'border-slate-200'}`} key={value}><input checked={values.verificationRoute === value} className="mt-0.5 accent-green-700" name="verificationRoute" onChange={() => setField('verificationRoute', value)} type="radio" /><span className="text-sm font-semibold text-slate-800">{label}</span></label>)}</div>{errors.verificationRoute && <p className="mt-1 text-sm text-red-700">{errors.verificationRoute}</p>}</fieldset>

          {values.verificationRoute === 'invoice' && <div className="mt-6 rounded-2xl border border-slate-200 p-4 sm:p-5"><h3 className="flex items-center gap-2 font-semibold text-slate-900"><FileText aria-hidden="true" className="text-green-700" size={18} />Invoice route</h3><label className="mt-4 block text-sm font-semibold text-slate-800" htmlFor="invoiceFile">Purchase bill or invoice <span className="text-red-700">*</span></label><input accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-800" id="invoiceFile" onChange={(event) => updateFile(event, setInvoiceFile, 'invoiceFile')} type="file" />{invoiceFile && <p className="mt-1 text-xs text-slate-500">{invoiceFile.name}</p>}{errors.invoiceFile && <p className="mt-1 text-sm text-red-700">{errors.invoiceFile}</p>}<div className="mt-5 grid gap-5 sm:grid-cols-2">{invoiceQuestions.map(([name, label]) => <div key={name}><label className="text-sm font-semibold text-slate-800" htmlFor={name}>{label} *</label><textarea className={fieldClass} id={name} maxLength={2000} onChange={(event) => setField(name, event.target.value)} required value={values[name]} />{errors[name] && <p className="mt-1 text-sm text-red-700">{errors[name]}</p>}</div>)}</div></div>}

          {values.verificationRoute === 'no_invoice' && <div className="mt-6 rounded-2xl border border-slate-200 p-4 sm:p-5"><h3 className="font-semibold text-slate-900">No-invoice verification</h3><p className="mt-1 text-sm leading-6 text-slate-600">Answer the ownership questions, then photograph the resource with a one-time challenge code.</p><div className="mt-5 grid gap-5 sm:grid-cols-2">{noInvoiceQuestions.map(([name, label]) => <div key={name}><label className="text-sm font-semibold text-slate-800" htmlFor={name}>{label} *</label><textarea className={fieldClass} id={name} maxLength={2000} onChange={(event) => setField(name, event.target.value)} required value={values[name]} />{errors[name] && <p className="mt-1 text-sm text-red-700">{errors[name]}</p>}</div>)}{input('serialNumber', 'Serial number', { required: true, hint: 'Private verification information; not shown on the public listing.' })}</div><label className="mt-5 block text-sm font-semibold text-slate-800" htmlFor="possessionFile">Fresh possession photograph <span className="text-red-700">*</span></label><input accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-800" id="possessionFile" onChange={(event) => updateFile(event, setPossessionFile, 'possessionFile')} type="file" />{possessionFile && <p className="mt-1 text-xs text-slate-500">{possessionFile.name}</p>}{errors.possessionFile && <p className="mt-1 text-sm text-red-700">{errors.possessionFile}</p>}{possessionCode && <div className="mt-4 rounded-xl bg-green-50 p-4"><p className="text-sm font-semibold text-green-950">One-time possession code</p><p className="mt-1 font-mono text-2xl font-bold tracking-[0.2em] text-green-800">{possessionCode}</p><p className="mt-2 text-xs text-green-900">Write this code on paper and include it in the photo. Expires {new Date(possessionCodeExpiresAt).toLocaleTimeString()}.</p></div>}</div>}

          {values.verificationRoute && <label className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"><input checked={values.ownershipDeclaration} className="mt-1 accent-green-700" onChange={(event) => setField('ownershipDeclaration', event.target.checked)} type="checkbox" /><span>I confirm that I own this resource or am authorised to list it.</span></label>}
          {errors.ownershipDeclaration && <p className="mt-1 text-sm text-red-700">{errors.ownershipDeclaration}</p>}
        </div>}

        {step === 5 && <div>
          <div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-green-50 text-green-800"><BadgeCheck aria-hidden="true" size={20} /></span><div><h2 className="text-xl font-semibold text-slate-950">Review and submit</h2><p className="mt-1 text-sm leading-6 text-slate-600">Your listing will be a draft until an administrator approves the ownership verification.</p></div></div>
          <dl className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 px-4">
            {[
              ['Title', values.title],
              ['Category', values.category],
              ['Listing owner', values.ownerType === 'organisation' ? organisationOptions.find((item) => (item._id || item.id) === values.organisationId)?.name || 'Organisation' : 'Individual'],
              ['Location', [values.city, values.state].filter(Boolean).join(', ')],
              ['Photos', `${imageUrls.length} uploaded`],
              ['Pricing', `₹${values.price || '—'} / ${values.priceUnit === 'daily' ? 'day' : 'hour'}`],
              ['Deposit', Number(values.deposit) ? `₹${values.deposit}` : 'None'],
              ['Availability', `${values.availableFrom || '—'} to ${values.availableUntil || '—'}`],
              ['Verification route', values.verificationRoute === 'invoice' ? 'Invoice' : values.verificationRoute === 'no_invoice' ? 'No invoice' : 'Not selected'],
              ...(values.verificationRoute === 'no_invoice' ? [['Private serial number', maskedSerial]] : []),
            ].map(([label, value]) => <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr]" key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="text-sm font-medium text-slate-900">{value}</dd></div>)}
          </dl>
          {createdResource && <div className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-950"><p className="font-semibold">Draft listing saved</p><p className="mt-1">Resource ID: <code>{createdResource._id || createdResource.id}</code></p><p className="mt-1">Verification status: {verificationStatus.replaceAll('_', ' ')}</p>{values.verificationRoute === 'no_invoice' && !possessionProofUploaded && possessionCode && <p className="mt-2">Select the challenge photo and submit again to complete the possession proof.</p>}</div>}
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700"><LockKeyhole aria-hidden="true" className="mt-0.5 shrink-0" size={17} /><p>Ownership documents are uploaded to private storage and are not displayed on the public listing.</p></div>
        </div>}

        {message && <p aria-live="polite" className={`mt-6 rounded-xl px-4 py-3 text-sm leading-6 ${message.toLowerCase().includes('saved') || message.toLowerCase().includes('submitted') || message.toLowerCase().includes('uploaded') ? 'bg-green-50 text-green-900' : 'bg-amber-50 text-amber-950'}`}>{message}</p>}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <button className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" disabled={step === 0 || isSubmitting} onClick={() => { setStep((current) => current - 1); setMessage('') }} type="button"><ArrowLeft aria-hidden="true" size={16} />Back</button>
          {step < steps.length - 1 ? <button className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800" onClick={() => { if (validateStep()) setStep((current) => current + 1) }} type="button">Continue <ArrowRight aria-hidden="true" size={16} /></button> : <button className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-50" disabled={isSubmitting} onClick={() => { if (validateStep()) submitListing() }} type="button">{isSubmitting ? 'Submitting…' : possessionCode && !possessionProofUploaded ? 'Submit possession proof' : invoiceUploaded || possessionProofUploaded ? 'Resume verification submission' : 'Create listing & submit verification'} <ArrowRight aria-hidden="true" size={16} /></button>}
        </div>
      </div>
    </section>
  )
}

export default ListingWizardPage
