import { useRef, useState } from 'react'
import { ImagePlus, LoaderCircle, X } from 'lucide-react'
import { uploadCloudinaryImage } from '../services/cloudinary.js'

const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxFileSize = 10 * 1024 * 1024

export default function CloudinaryImageUploader({ id, purpose, images, onChange, minimum = 1, maximum = 20 }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  async function handleSelection(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    setError('')
    if (!files.length) return
    if (images.length + files.length > maximum) {
      setError(`You can add no more than ${maximum} photos.`)
      return
    }
    const invalidFile = files.find((file) => !acceptedTypes.includes(file.type) || file.size > maxFileSize)
    if (invalidFile) {
      setError('Choose JPEG, PNG, or WebP images no larger than 10 MB each.')
      return
    }

    setUploading(true)
    try {
      for (const [index, file] of files.entries()) {
        setProgress(0)
        const url = await uploadCloudinaryImage(file, purpose, setProgress)
        onChange((current) => [...current, url])
        setProgress(files.length > 1 ? Math.round(((index + 1) / files.length) * 100) : 100)
      }
    } catch (uploadError) {
      setError(uploadError.response?.data?.error?.message || uploadError.response?.data?.message || uploadError.message || 'Image upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="text-sm font-semibold text-slate-800" htmlFor={id}>Photos <span className="text-red-700">*</span></label>
      <p className="mt-1 text-xs leading-5 text-slate-500">JPEG, PNG, or WebP; up to 10 MB per photo. {images.length} uploaded{minimum > 1 ? ` · at least ${minimum} required` : ''} · maximum {maximum}.</p>
      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={uploading || images.length >= maximum}
        id={id}
        multiple
        onChange={handleSelection}
        ref={inputRef}
        type="file"
      />
      <button
        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={uploading || images.length >= maximum}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        {uploading ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : <ImagePlus aria-hidden="true" size={17} />}
        {uploading ? `Uploading ${progress}%` : 'Choose photos'}
      </button>
      {error && <p aria-live="polite" className="mt-2 text-sm text-red-700">{error}</p>}
      {images.length > 0 && <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{images.map((url, index) => (
        <li className="relative overflow-hidden rounded-xl border border-slate-200" key={url}>
          <img alt={`Uploaded photo ${index + 1}`} className="aspect-square w-full object-cover" src={url} />
          <button
            aria-label={`Remove photo ${index + 1}`}
            className="absolute right-2 top-2 rounded-full bg-white/95 p-1.5 text-slate-700 shadow hover:text-red-700"
            disabled={uploading}
            onClick={() => onChange((current) => current.filter((item) => item !== url))}
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </li>
      ))}</ul>}
    </div>
  )
}
