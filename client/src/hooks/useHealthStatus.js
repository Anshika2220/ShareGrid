import { useCallback, useEffect, useState } from 'react'
import { checkHealth } from '../services/healthService.js'

export function useHealthStatus() {
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState({ state: 'loading', message: '' })

  useEffect(() => {
    const controller = new AbortController()

    checkHealth(controller.signal)
      .then(() => setStatus({ state: 'online', message: '' }))
      .catch((error) => {
        if (!controller.signal.aborted) {
          setStatus({ state: 'offline', message: error.message })
        }
      })

    return () => controller.abort()
  }, [attempt])

  const refresh = useCallback(() => {
    setStatus({ state: 'loading', message: '' })
    setAttempt((current) => current + 1)
  }, [])

  return { ...status, refresh }
}
