import axios from 'axios'

export const AUTH_TOKEN_STORAGE_KEY = 'sharegrid_token'
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
export const SESSION_EXPIRED_EVENT = 'sharegrid:session-expired'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = globalThis.localStorage?.getItem(AUTH_TOKEN_STORAGE_KEY)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && globalThis.localStorage?.getItem(AUTH_TOKEN_STORAGE_KEY)) {
      globalThis.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
      globalThis.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    }

    return Promise.reject(error)
  },
)

export function getApiErrorMessage(error) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string' && message.trim()) return message
    if (error.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.'
    if (!error.response) return 'Could not reach the ShareGrid server. Check your connection and try again.'
  }

  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
