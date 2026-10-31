import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, AUTH_TOKEN_STORAGE_KEY, getApiErrorMessage, SESSION_EXPIRED_EVENT } from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const onExpired = () => {
      setUser(null)
      setError('Your session expired. Please log in again.')
    }
    globalThis.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => globalThis.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [])

  useEffect(() => {
    const token = globalThis.localStorage?.getItem(AUTH_TOKEN_STORAGE_KEY)
    if (!token) {
      setIsLoading(false)
      return undefined
    }

    const controller = new AbortController()
    api.get('/auth/me', { signal: controller.signal })
      .then(({ data }) => {
        setUser(data.data.user)
        setError('')
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(requestError))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [])

  const establishSession = useCallback((data) => {
    globalThis.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.token)
    setUser(data.user)
    setError('')
    return data
  }, [])

  const login = useCallback(async (credentials) => {
    const { data } = await api.post('/auth/login', credentials)
    return establishSession(data.data)
  }, [establishSession])

  const register = useCallback(async (account) => {
    const { data } = await api.post('/auth/register', account)
    return establishSession(data.data)
  }, [establishSession])

  const logout = useCallback(async () => {
    try {
      if (globalThis.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)) {
        await api.post('/auth/logout')
      }
    } finally {
      globalThis.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
      setUser(null)
    }
  }, [])

  const clearSession = useCallback(() => {
    globalThis.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    setUser(null)
    setError('')
  }, [])

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me')
    setUser(data.data.user)
    return data.data.user
  }, [])

  const value = useMemo(() => ({
    user,
    isLoading,
    error,
    login,
    register,
    logout,
    clearSession,
    refreshUser,
    setUser,
  }), [user, isLoading, error, login, register, logout, clearSession, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
