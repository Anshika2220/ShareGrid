import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout.jsx'
import HealthPage from './pages/HealthPage.jsx'
import LandingPage from './pages/LandingPage.jsx'
import ListingWizardPage from './pages/ListingWizardPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import AuthPage from './pages/AuthPage.jsx'
import BookingsPage from './pages/BookingsPage.jsx'
import BookingDetailsPage from './pages/BookingDetailsPage.jsx'
import HandoverPage from './pages/HandoverPage.jsx'
import IncidentPage from './pages/IncidentPage.jsx'
import ReviewPage from './pages/ReviewPage.jsx'
import ConversationsPage from './pages/ConversationsPage.jsx'
import ConversationPage from './pages/ConversationPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import NotificationsPage from './pages/NotificationsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import ResourceDetailsPage from './pages/ResourceDetailsPage.jsx'
import ResourceDiscoveryPage from './pages/ResourceDiscoveryPage.jsx'
import { useHealthStatus } from './hooks/useHealthStatus.js'
import RequireAuth from './components/common/RequireAuth.jsx'
import VerifyEmailPage from './pages/VerifyEmailPage.jsx'
import IncidentDetailsPage from './pages/IncidentDetailsPage.jsx'

const OrganisationsPage = lazy(() => import('./pages/OrganisationsPage.jsx'))
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))

function App() {
  const health = useHealthStatus()

  return (
    <AppLayout health={health}>
      <Routes>
        <Route path="/" element={<LandingPage health={health} />} />
        <Route path="/resources" element={<ResourceDiscoveryPage />} />
        <Route path="/resources/:resourceId" element={<ResourceDetailsPage />} />
        <Route path="/list-resource" element={<RequireAuth><ListingWizardPage /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="/bookings" element={<RequireAuth><BookingsPage /></RequireAuth>} />
        <Route path="/bookings/:bookingId" element={<RequireAuth><BookingDetailsPage /></RequireAuth>} />
        <Route path="/bookings/:bookingId/handover" element={<RequireAuth><HandoverPage /></RequireAuth>} />
        <Route path="/bookings/:bookingId/incident" element={<RequireAuth><IncidentPage /></RequireAuth>} />
        <Route path="/bookings/:bookingId/review" element={<RequireAuth><ReviewPage /></RequireAuth>} />
        <Route path="/incidents/:incidentId" element={<RequireAuth><IncidentDetailsPage /></RequireAuth>} />
        <Route path="/conversations" element={<RequireAuth><ConversationsPage /></RequireAuth>} />
        <Route path="/conversations/:conversationId" element={<RequireAuth><ConversationPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/organisations" element={<RequireAuth><Suspense fallback={<div className="mx-auto grid min-h-[50vh] max-w-7xl place-items-center px-5 text-sm text-slate-600">Loading organisations…</div>}><OrganisationsPage /></Suspense></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth roles={['admin']}><Suspense fallback={<div className="mx-auto grid min-h-[50vh] max-w-7xl place-items-center px-5 text-sm text-slate-600">Loading admin workspace…</div>}><AdminPage /></Suspense></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/forgot-password" element={<AuthPage mode="forgot-password" />} />
        <Route path="/reset-password" element={<AuthPage mode="reset-password" />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/health" element={<HealthPage health={health} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  )
}

export default App
