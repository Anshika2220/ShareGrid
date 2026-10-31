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

function App() {
  const health = useHealthStatus()

  return (
    <AppLayout health={health}>
      <Routes>
        <Route path="/" element={<LandingPage health={health} />} />
        <Route path="/resources" element={<ResourceDiscoveryPage />} />
        <Route path="/resources/:resourceId" element={<ResourceDetailsPage />} />
        <Route path="/list-resource" element={<ListingWizardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/bookings/:bookingId" element={<BookingDetailsPage />} />
        <Route path="/bookings/:bookingId/handover" element={<HandoverPage />} />
        <Route path="/bookings/:bookingId/incident" element={<IncidentPage />} />
        <Route path="/bookings/:bookingId/review" element={<ReviewPage />} />
        <Route path="/conversations" element={<ConversationsPage />} />
        <Route path="/conversations/:conversationId" element={<ConversationPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/forgot-password" element={<AuthPage mode="forgot-password" />} />
        <Route path="/health" element={<HealthPage health={health} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  )
}

export default App
