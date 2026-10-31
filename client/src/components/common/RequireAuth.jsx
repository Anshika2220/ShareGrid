import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

function RequireAuth({ children, roles }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="mx-auto grid min-h-[50vh] max-w-7xl place-items-center px-5 text-sm text-slate-600">
        Loading your ShareGrid session…
      </div>
    )
  }

  if (!user) return <Navigate replace state={{ from: location }} to="/login" />
  if (roles && !roles.some((role) => user.roles?.includes(role))) {
    return <Navigate replace to="/dashboard" />
  }

  return children
}

export default RequireAuth
