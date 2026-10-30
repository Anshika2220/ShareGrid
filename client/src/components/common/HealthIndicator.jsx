import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

function HealthIndicator({ health }) {
  const indicators = {
    loading: {
      label: 'Checking API',
      Icon: LoaderCircle,
      className: 'text-slate-500',
    },
    online: {
      label: 'API connected',
      Icon: CircleCheck,
      className: 'text-emerald-700',
    },
    offline: {
      label: 'API unavailable',
      Icon: CircleAlert,
      className: 'text-amber-700',
    },
  }
  const indicator = indicators[health.state]
  const { Icon } = indicator

  return (
    <Link
      aria-label={`${indicator.label}. View API status.`}
      className={`inline-flex items-center gap-2 text-sm font-medium ${indicator.className}`}
      to="/health"
    >
      <Icon
        aria-hidden="true"
        className={health.state === 'loading' ? 'animate-spin' : ''}
        size={16}
      />
      <span>{indicator.label}</span>
    </Link>
  )
}

export default HealthIndicator
