import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout.jsx'
import HealthPage from './pages/HealthPage.jsx'
import LandingPage from './pages/LandingPage.jsx'
import ListingWizardPage from './pages/ListingWizardPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import AuthPage from './pages/AuthPage.jsx'
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
