import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout.jsx'
import HealthPage from './pages/HealthPage.jsx'
import LandingPage from './pages/LandingPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import { useHealthStatus } from './hooks/useHealthStatus.js'

function App() {
  const health = useHealthStatus()

  return (
    <AppLayout health={health}>
      <Routes>
        <Route path="/" element={<LandingPage health={health} />} />
        <Route path="/health" element={<HealthPage health={health} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  )
}

export default App
