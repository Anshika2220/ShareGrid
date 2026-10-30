import { Info } from 'lucide-react'

function IntegrationNotice({ children }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-100 p-4 text-sm leading-6 text-slate-900">
      <Info aria-hidden="true" className="mt-0.5 shrink-0 text-slate-900" size={18} />
      <p>{children}</p>
    </div>
  )
}

export default IntegrationNotice
