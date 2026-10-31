import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CircleHelp,
  FileImage,
  FileText,
  ImagePlus,
  LockKeyhole,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import IntegrationNotice from '../components/common/IntegrationNotice.jsx'

const steps = [
  'Basics',
  'Photos',
  'Pricing',
  'Availability',
  'Verification',
  'Review',
]

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
  { name: 'invoiceOwner', label: 'Is the invoice in your name or your organisation’s name?' },
  { name: 'possessionDuration', label: 'How long have you had this resource in your possession?' },
  { name: 'resourceUse', label: 'What do you use this resource for?' },
  { name: 'possessionProof', label: 'Can you provide fresh possession evidence when requested?' },
]

const noInvoiceQuestions = [
  { name: 'purchaseSource', label: 'Where did you obtain this resource?' },
  { name: 'possessionDuration', label: 'How long has it been in your possession?' },
  { name: 'ownershipDetails', label: 'Why are you authorised to list this resource?' },
  { name: 'resourceUse', label: 'What do you use this resource for?' },
  { name: 'identifyingMarks', label: 'Describe identifying marks or distinguishing features.' },
  { name: 'serialLocation', label: 'Where can the model and serial details be found?' },
  { name: 'powerOn', label: 'Can you show the resource powering on, if applicable?' },
  { name: 'supportingProof', label: 'What other supporting proof can you provide?' },
  { name: 'freshEvidence', label: 'Can you provide fresh, multi-angle possession evidence?' },
]

const initialValues = {
  ownerType: 'individual',
  organizationName: '',
  title: '',
  category: '',
  brand: '',
  model: '',
  description: '',
  condition: '',
  price: '',
  priceUnit: 'daily',
  deposit: '',
  depositTerms: '',
  availableFrom: '',
  availableTo: '',
  blockedDates: '',
  verificationRoute: '',
  ownershipDeclaration: '',
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
}

const inputClass =
  'mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'

function ListingWizardPage() {
  const [step, setStep] = useState(0)
  const [values, setValues] = useState(initialValues)
  const [photos, setPhotos] = useState([])
  const [invoiceFile, setInvoiceFile] = useState(null)
  const [possessionFile, setPossessionFile] = useState(null)
  const [organizationEvidenceFile, setOrganizationEvidenceFile] = useState(null)
  const [supportingFiles, setSupportingFiles] = useState([])
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')
  const photoInput = useRef(null)
  const photoUrls = useRef(new Set())

  useEffect(() => () => {
    photoUrls.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  function setField(name, value) {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
    setNotice('')
  }

  function addPhotos(fileList) {
    const incoming = Array.from(fileList)
    const valid = []
    let message = ''

    incoming.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        message = 'Choose image files only.'
      } else if (file.size > 10 * 1024 * 1024) {
        message = `${file.name} is larger than 10 MB. Choose a smaller image.`
      } else {
        valid.push(file)
      }
    })

    const slots = Math.max(0, 10 - photos.length)
    const selected = valid.slice(0, slots).map((file) => {
      const url = URL.createObjectURL(file)
      photoUrls.current.add(url)
      return { file, url, id: `${file.name}-${file.lastModified}-${url}` }
    })

    if (valid.length > slots) {
      message = 'A listing can include up to 10 photos.'
    }

    if (selected.length) {
      setPhotos((current) => [...current, ...selected])
      setErrors((current) => {
        const next = { ...current }
        delete next.photos
        return next
      })
    }
    setNotice(message)
    if (photoInput.current) photoInput.current.value = ''
  }

  function removePhoto(photo) {
    URL.revokeObjectURL(photo.url)
    photoUrls.current.delete(photo.url)
    setPhotos((current) => current.filter((item) => item.id !== photo.id))
  }

  function validateCurrentStep() {
    const nextErrors = {}
    const required = (name, label) => {
      if (!String(values[name] ?? '').trim()) nextErrors[name] = `${label} is required.`
    }

    if (step === 0) {
      if (values.ownerType === 'organization') required('organizationName', 'Organisation name')
      required('title', 'Resource title')
      required('category', 'Category')
      required('description', 'Description')
      required('condition', 'Condition')
    }

    if (step === 1 && photos.length < 4) {
      nextErrors.photos = `Add at least 4 photos. You have selected ${photos.length}.`
    }

    if (step === 2) {
      required('price', 'Rental price')
      if (values.price && (!Number.isFinite(Number(values.price)) || Number(values.price) <= 0)) {
        nextErrors.price = 'Enter a price greater than zero.'
      }
      if (Number(values.deposit) < 0) nextErrors.deposit = 'Deposit cannot be negative.'
      if (Number(values.deposit) > 0) required('depositTerms', 'Deposit terms')
    }

    if (step === 3) {
      required('availableFrom', 'Availability start date')
      required('availableTo', 'Availability end date')
      if (values.availableFrom && values.availableTo && values.availableTo < values.availableFrom) {
        nextErrors.availableTo = 'End date must be on or after the start date.'
      }
    }

    if (step === 4) {
      required('verificationRoute', 'Verification route')
      if (values.verificationRoute === 'invoice') {
        if (!invoiceFile) nextErrors.invoiceFile = 'Select the invoice or purchase bill.'
        invoiceQuestions.forEach(({ name, label }) => required(name, label))
      }
      if (values.verificationRoute === 'no-invoice') {
        noInvoiceQuestions.forEach(({ name, label }) => required(name, label))
        required('serialNumber', 'Serial number')
        if (!possessionFile) nextErrors.possessionFile = 'Select possession evidence to continue.'
      }
      if (values.verificationRoute) {
        required('ownershipDeclaration', 'Ownership declaration')
      }
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      setNotice('Review the highlighted fields before continuing.')
      return false
    }

    setNotice('')
    return true
  }

  function goNext() {
    if (validateCurrentStep()) {
      setStep((current) => Math.min(current + 1, steps.length - 1))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function goBack() {
    setNotice('')
    setErrors({})
    setStep((current) => Math.max(current - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function setSingleFile(event, setter, errorKey, acceptedTypes) {
    const file = event.target.files?.[0] ?? null
    const matchesType = (candidate) => acceptedTypes.some((type) => {
      if (type.startsWith('.')) return candidate.name.toLowerCase().endsWith(type)
      if (type.endsWith('/*')) return candidate.type.startsWith(type.slice(0, -1))
      return candidate.type === type
    })

    if (file && !matchesType(file)) {
      setter(null)
      setErrors((current) => ({ ...current, [errorKey]: 'Choose a file in one of the accepted formats.' }))
      setNotice('The selected file type is not supported.')
      event.target.value = ''
      return
    }

    if (file && file.size > 20 * 1024 * 1024) {
      setter(null)
      setErrors((current) => ({ ...current, [errorKey]: 'Evidence files must be 20 MB or smaller.' }))
      setNotice('The selected file is too large.')
      event.target.value = ''
      return
    }

    setter(file)
    setErrors((current) => {
      const next = { ...current }
      delete next[errorKey]
      return next
    })
  }

  function addSupportingFiles(fileList) {
    const files = Array.from(fileList).filter((file) => file.size <= 10 * 1024 * 1024)
    setSupportingFiles(files)
    setNotice(files.length < fileList.length ? 'Supporting files must be 10 MB or smaller.' : '')
  }

  function renderError(name) {
    return errors[name] ? (
      <p className="mt-1.5 text-sm text-red-700" id={`${name}-error`} role="alert">
        {errors[name]}
      </p>
    ) : null
  }

  function renderTextField({ name, label, hint, type = 'text', required = false }) {
    return (
      <div key={name}>
        <label className="text-sm font-semibold text-slate-800" htmlFor={name}>
          {label}{required && <span className="text-red-700"> *</span>}
        </label>
        {hint && <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>}
        <input
          aria-describedby={errors[name] ? `${name}-error` : undefined}
          aria-invalid={Boolean(errors[name])}
          className={`${inputClass} ${errors[name] ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
          id={name}
          name={name}
          onChange={(event) => setField(name, event.target.value)}
          type={type}
          value={values[name]}
        />
        {renderError(name)}
      </div>
    )
  }

  function renderQuestionFields(questions) {
    return (
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {questions.map(({ name, label }) => renderTextField({ name, label, required: true }))}
      </div>
    )
  }

  const selectedFileLabel = (file) => file?.name || 'No file selected'

  return (
    <section className="mx-auto min-h-[70vh] max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700"
        to="/"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Back to ShareGrid
      </Link>

      <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Share a resource</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Create a listing
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Add the details renters need, then submit it for ownership review.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          Step {step + 1} of {steps.length}
        </span>
      </div>

      <ol aria-label="Listing progress" className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
        {steps.map((label, index) => {
          const complete = index < step
          const current = index === step
          return (
            <li aria-current={current ? 'step' : undefined} className="min-w-0" key={label}>
              <div className={`h-1.5 rounded-full ${complete || current ? 'bg-blue-700' : 'bg-slate-200'}`} />
              <p className={`mt-2 truncate text-xs font-semibold ${current ? 'text-blue-800' : complete ? 'text-slate-700' : 'text-slate-400'}`}>
                {complete && <Check aria-hidden="true" className="mr-1 inline" size={13} />}
                {label}
              </p>
            </li>
          )
        })}
      </ol>

      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          {step === 0 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Basic information</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Help people understand what the resource is and how it is cared for.</p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-800" htmlFor="ownerType">
                    Listing on behalf of
                  </label>
                  <select
                    className={inputClass}
                    id="ownerType"
                    onChange={(event) => setField('ownerType', event.target.value)}
                    value={values.ownerType}
                  >
                    <option value="individual">Myself</option>
                    <option value="organization">An organisation</option>
                  </select>
                </div>
                {values.ownerType === 'organization' && renderTextField({
                  name: 'organizationName',
                  label: 'Organisation name',
                  required: true,
                })}
                {renderTextField({ name: 'title', label: 'Resource title', required: true })}
                <div>
                  <label className="text-sm font-semibold text-slate-800" htmlFor="category">
                    Category <span className="text-red-700">*</span>
                  </label>
                  <select
                    className={inputClass}
                    id="category"
                    onChange={(event) => setField('category', event.target.value)}
                    value={values.category}
                  >
                    <option value="">Choose a category</option>
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                  {renderError('category')}
                </div>
                {renderTextField({ name: 'brand', label: 'Brand or company', hint: 'Optional' })}
                {renderTextField({ name: 'model', label: 'Model name', hint: 'Optional' })}
                <div className="sm:col-span-2">
                  <label className="text-sm font-semibold text-slate-800" htmlFor="description">
                    Description <span className="text-red-700">*</span>
                  </label>
                  <textarea
                    className={`${inputClass} min-h-32 resize-y`}
                    id="description"
                    onChange={(event) => setField('description', event.target.value)}
                    placeholder="Describe what is included and what renters should know."
                    rows={4}
                    value={values.description}
                  />
                  {renderError('description')}
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-semibold text-slate-800" htmlFor="condition">
                    Current condition <span className="text-red-700">*</span>
                  </label>
                  <select
                    className={inputClass}
                    id="condition"
                    onChange={(event) => setField('condition', event.target.value)}
                    value={values.condition}
                  >
                    <option value="">Select condition</option>
                    <option value="new">New</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                  </select>
                  {renderError('condition')}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                  <FileImage aria-hidden="true" size={20} />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Resource photographs</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Add at least 4 clear images. You can select up to 10 images, each up to 10 MB.
                  </p>
                </div>
              </div>
              <input
                accept="image/*"
                className="sr-only"
                multiple
                onChange={(event) => addPhotos(event.target.files ?? [])}
                ref={photoInput}
                type="file"
              />
              <button
                className="mt-6 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-9 text-center transition hover:border-blue-400 hover:bg-blue-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                onClick={() => photoInput.current?.click()}
                type="button"
              >
                <ImagePlus aria-hidden="true" className="text-blue-700" size={28} />
                <span className="mt-3 text-sm font-semibold text-slate-800">Choose photos</span>
                <span className="mt-1 text-xs text-slate-500">JPG, PNG, WebP or other image formats</span>
              </button>
              {renderError('photos')}
              <p aria-live="polite" className="mt-4 text-sm font-medium text-slate-600">
                {photos.length} of 4 minimum photos selected
              </p>
              {photos.length > 0 && (
                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {photos.map((photo) => (
                    <li className="group relative overflow-hidden rounded-xl border border-slate-200" key={photo.id}>
                      <img alt={`Preview: ${photo.file.name}`} className="aspect-square w-full object-cover" src={photo.url} />
                      <div className="flex items-center justify-between gap-2 p-2">
                        <span className="min-w-0 truncate text-xs text-slate-600">{photo.file.name}</span>
                        <button
                          aria-label={`Remove ${photo.file.name}`}
                          className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-red-600"
                          onClick={() => removePhoto(photo)}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" size={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-5 text-xs leading-5 text-slate-500">
                Photo previews stay in this browser session. They are not uploaded or saved.
              </p>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Set your asking price</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Enter the rental rate you want to ask. Any negotiation guidance will come from the backend.
              </p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-800" htmlFor="price">
                    Rental price (₹) <span className="text-red-700">*</span>
                  </label>
                  <input
                    className={inputClass}
                    id="price"
                    min="1"
                    onChange={(event) => setField('price', event.target.value)}
                    placeholder="Enter amount"
                    type="number"
                    value={values.price}
                  />
                  {renderError('price')}
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-800" htmlFor="priceUnit">
                    Pricing unit <span className="text-red-700">*</span>
                  </label>
                  <select
                    className={inputClass}
                    id="priceUnit"
                    onChange={(event) => setField('priceUnit', event.target.value)}
                    value={values.priceUnit}
                  >
                    <option value="hourly">Per hour</option>
                    <option value="daily">Per day</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-800" htmlFor="deposit">
                    Refundable security deposit (₹)
                  </label>
                  <p className="mt-1 text-xs text-slate-500">Optional. Leave blank if you do not require one.</p>
                  <input
                    className={inputClass}
                    id="deposit"
                    min="0"
                    onChange={(event) => setField('deposit', event.target.value)}
                    placeholder="No deposit"
                    type="number"
                    value={values.deposit}
                  />
                  {renderError('deposit')}
                </div>
                {Number(values.deposit) > 0 && (
                  <div>
                    <label className="text-sm font-semibold text-slate-800" htmlFor="depositTerms">
                      Deposit terms <span className="text-red-700">*</span>
                    </label>
                    <textarea
                      className={`${inputClass} min-h-24`}
                      id="depositTerms"
                      onChange={(event) => setField('depositTerms', event.target.value)}
                      placeholder="Explain the refund terms and any conditions."
                      value={values.depositTerms}
                    />
                    {renderError('depositTerms')}
                  </div>
                )}
              </div>
              <IntegrationNotice>
                Only your asking price is collected here. Permitted offer ranges and final booking
                prices must be supplied by the backend.
              </IntegrationNotice>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Availability</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Add your intended availability. Final availability and inspection buffers will be determined by the backend.
              </p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {renderTextField({ name: 'availableFrom', label: 'Available from', type: 'date', required: true })}
                {renderTextField({ name: 'availableTo', label: 'Available until', type: 'date', required: true })}
                <div className="sm:col-span-2">
                  <label className="text-sm font-semibold text-slate-800" htmlFor="blockedDates">
                    Dates you usually cannot lend
                  </label>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Optional note for now. Calendar dates and owner blocks will be connected when the availability API is defined.
                  </p>
                  <textarea
                    className={`${inputClass} min-h-24`}
                    id="blockedDates"
                    onChange={(event) => setField('blockedDates', event.target.value)}
                    placeholder="For example, unavailable most weekends"
                    value={values.blockedDates}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <ShieldCheck aria-hidden="true" size={20} />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Ownership verification</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Choose the route that fits. Evidence is not sent from this form; private uploads will use the backend’s secure verification flow.
                  </p>
                </div>
              </div>

              <fieldset className="mt-6">
                <legend className="text-sm font-semibold text-slate-800">
                  Do you have the purchase bill or invoice? <span className="text-red-700">*</span>
                </legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[
                    ['invoice', 'Yes, I have an invoice'],
                    ['no-invoice', 'No, I do not have an invoice'],
                  ].map(([value, label]) => (
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                        values.verificationRoute === value
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      key={value}
                    >
                      <input
                        checked={values.verificationRoute === value}
                        className="mt-0.5 accent-blue-700"
                        name="verificationRoute"
                        onChange={() => setField('verificationRoute', value)}
                        type="radio"
                        value={value}
                      />
                      <span className="text-sm font-semibold text-slate-800">{label}</span>
                    </label>
                  ))}
                </div>
                {renderError('verificationRoute')}
              </fieldset>

              {values.verificationRoute === 'invoice' && (
                <div className="mt-6 rounded-2xl border border-slate-200 p-4 sm:p-5">
                  <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                    <FileText aria-hidden="true" className="text-blue-700" size={18} />
                    Invoice route
                  </h3>
                  <label className="mt-4 block text-sm font-semibold text-slate-800" htmlFor="invoiceFile">
                    Purchase bill or invoice <span className="text-red-700">*</span>
                  </label>
                  <input
                    accept="image/*,.pdf"
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-800"
                    id="invoiceFile"
                    onChange={(event) => setSingleFile(event, setInvoiceFile, 'invoiceFile', ['image/*', '.pdf'])}
                    type="file"
                  />
                  <p className="mt-1 text-xs text-slate-500">{selectedFileLabel(invoiceFile)}</p>
                  {renderError('invoiceFile')}
                  {renderQuestionFields(invoiceQuestions)}
                  <label className="mt-6 block text-sm font-semibold text-slate-800" htmlFor="possessionFile">
                    Fresh possession photo or video
                  </label>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    The backend must provide a one-time code before this evidence can be captured or submitted.
                  </p>
                  <input
                    accept="image/*,video/*"
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-800"
                    id="invoicePossessionFile"
                    onChange={(event) => setSingleFile(event, setPossessionFile, 'possessionFile', ['image/*', 'video/*'])}
                    type="file"
                  />
                  <p className="mt-1 text-xs text-slate-500">{selectedFileLabel(possessionFile)}</p>
                </div>
              )}

              {values.verificationRoute === 'no-invoice' && (
                <div className="mt-6 rounded-2xl border border-slate-200 p-4 sm:p-5">
                  <h3 className="font-semibold text-slate-900">No-invoice verification</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Provide context for a manual ownership review. The live possession check and one-time code require backend support.
                  </p>
                  <div className="mt-5">
                    {renderTextField({
                      name: 'serialNumber',
                      label: 'Serial number',
                      hint: 'Private verification information. It will not be shown on a public listing.',
                      required: true,
                    })}
                  </div>
                  {renderQuestionFields(noInvoiceQuestions)}
                  <label className="mt-6 block text-sm font-semibold text-slate-800" htmlFor="noInvoicePossessionFile">
                    Fresh multi-angle possession evidence <span className="text-red-700">*</span>
                  </label>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Choose a photo or video to identify what you intend to provide through the future private upload flow.
                  </p>
                  <input
                    accept="image/*,video/*"
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-800"
                    id="noInvoicePossessionFile"
                    onChange={(event) => setSingleFile(event, setPossessionFile, 'possessionFile', ['image/*', 'video/*'])}
                    type="file"
                  />
                  <p className="mt-1 text-xs text-slate-500">{selectedFileLabel(possessionFile)}</p>
                  {renderError('possessionFile')}
                  <label className="mt-5 block text-sm font-semibold text-slate-800" htmlFor="supportingFiles">
                    Other supporting documents
                  </label>
                  <input
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700"
                    id="supportingFiles"
                    multiple
                    onChange={(event) => addSupportingFiles(event.target.files ?? [])}
                    type="file"
                  />
                  {supportingFiles.length > 0 && (
                    <ul className="mt-2 list-inside list-disc text-xs text-slate-600">
                      {supportingFiles.map((file) => <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>)}
                    </ul>
                  )}
                </div>
              )}

              {values.verificationRoute && (
                <div className="mt-5">
                  <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    <input
                      checked={values.ownershipDeclaration === 'accepted'}
                      className="mt-1 accent-blue-700"
                      onChange={(event) => setField('ownershipDeclaration', event.target.checked ? 'accepted' : '')}
                      type="checkbox"
                    />
                    <span>I confirm that I own this resource or am authorised to list it.</span>
                  </label>
                  {errors.ownershipDeclaration && (
                    <p className="mt-1.5 text-sm text-red-700" role="alert">{errors.ownershipDeclaration}</p>
                  )}
                </div>
              )}

              {values.ownerType === 'organization' && (
                <div className="mt-5 rounded-2xl border border-slate-200 p-4 sm:p-5">
                  <label className="block text-sm font-semibold text-slate-800" htmlFor="organizationEvidenceFile">
                    Organisation asset-register proof or authorisation letter
                  </label>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Optional for this draft. The backend must provide secure private upload handling.
                  </p>
                  <input
                    accept="image/*,.pdf"
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-800"
                    id="organizationEvidenceFile"
                    onChange={(event) => setSingleFile(event, setOrganizationEvidenceFile, 'organizationEvidenceFile', ['image/*', '.pdf'])}
                    type="file"
                  />
                  <p className="mt-1 text-xs text-slate-500">{selectedFileLabel(organizationEvidenceFile)}</p>
                  {renderError('organizationEvidenceFile')}
                </div>
              )}

              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <LockKeyhole aria-hidden="true" className="mt-0.5 shrink-0 text-slate-500" size={18} />
                <p>Invoices and evidence are sensitive. They must be uploaded to private backend storage and must never appear on a public listing.</p>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                  <BadgeCheck aria-hidden="true" size={20} />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Review your listing</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Check the details before backend submission is enabled.
                  </p>
                </div>
              </div>

              <dl className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200">
                {[
                  ['Title', values.title],
                  ['Listing owner', values.ownerType === 'organization' ? `Organisation${values.organizationName ? ` · ${values.organizationName}` : ''}` : 'Individual'],
                  ['Category', values.category],
                  ['Brand and model', [values.brand, values.model].filter(Boolean).join(' · ') || 'Not provided'],
                  ['Description', values.description],
                  ['Condition', values.condition],
                  ['Photos', `${photos.length} selected`],
                  ['Asking price', values.price ? `₹${values.price} / ${values.priceUnit === 'daily' ? 'day' : 'hour'}` : 'Not provided'],
                  ['Refundable deposit', Number(values.deposit) > 0 ? `₹${values.deposit}` : 'No deposit'],
                  ['Deposit terms', Number(values.deposit) > 0 ? values.depositTerms : 'Not applicable'],
                  ['Availability', values.availableFrom && values.availableTo ? `${values.availableFrom} to ${values.availableTo}` : 'Not provided'],
                  ['Unavailable dates note', values.blockedDates || 'Not provided'],
                  ['Verification route', values.verificationRoute === 'invoice' ? 'Invoice available' : values.verificationRoute === 'no-invoice' ? 'Invoice unavailable' : 'Not selected'],
                  ...(values.verificationRoute === 'no-invoice'
                    ? [['Serial number', values.serialNumber ? `••••${values.serialNumber.slice(-4)}` : 'Not provided']]
                    : []),
                  ...(values.ownerType === 'organization'
                    ? [['Organisation evidence', selectedFileLabel(organizationEvidenceFile)]]
                    : []),
                  ['Ownership declaration', values.ownershipDeclaration === 'accepted' ? 'Confirmed' : 'Not confirmed'],
                ].map(([label, value]) => (
                  <div className="grid gap-1 px-4 py-3 sm:grid-cols-[150px_1fr] sm:gap-4" key={label}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
                    <dd className="break-words text-sm leading-6 text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-slate-900">Verification responses</h3>
                <dl className="mt-2 divide-y divide-slate-200 rounded-2xl border border-slate-200">
                  {(values.verificationRoute === 'invoice' ? invoiceQuestions : noInvoiceQuestions).map(({ name, label }) => (
                    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,0.8fr)_1fr] sm:gap-4" key={name}>
                      <dt className="text-xs leading-5 text-slate-500">{label}</dt>
                      <dd className="break-words text-sm leading-6 text-slate-800">{values[name] || 'Not provided'}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="mt-6">
                <IntegrationNotice>
                  Your listing has not been submitted. The backend must define the listing and evidence
                  upload contract before ShareGrid can safely send your information.
                </IntegrationNotice>
              </div>
              <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                Verification status will only be shown after the backend reviews your evidence. This review screen does not create a listing or mark it verified.
              </div>
            </div>
          )}

          {notice && (
            <p aria-live="polite" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {notice}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
            <button
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={step === 0}
              onClick={goBack}
              type="button"
            >
              <ArrowLeft aria-hidden="true" size={16} />
              Back
            </button>
            {step < steps.length - 1 ? (
              <button
                className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                onClick={goNext}
                type="button"
              >
                Continue <ArrowRight aria-hidden="true" size={16} />
              </button>
            ) : (
              <button
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600"
                disabled
                title="Listing submission will be enabled when the backend contract is available."
                type="button"
              >
                <Upload aria-hidden="true" size={16} />
                Submission unavailable
              </button>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CircleHelp aria-hidden="true" className="text-blue-700" size={18} />
              Before you begin
            </div>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
              <li>Use clear photos of the actual resource.</li>
              <li>Choose an honest condition and describe included accessories.</li>
              <li>Ownership checks are reviewed; they are not automatic approval.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">Your progress</p>
            <p className="mt-2 text-sm text-slate-600">{steps[step]} · {step + 1} of {steps.length}</p>
            <div aria-hidden="true" className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-700 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
            </div>
          </div>
          {step === 4 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950">
              <p className="font-semibold">Private by default</p>
              <p className="mt-2 text-emerald-900">Verification documents should only be visible to you and authorised reviewers.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}

export default ListingWizardPage
