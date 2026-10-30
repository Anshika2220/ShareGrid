import { API_BASE_URL, api } from './api.js'

export async function checkHealth(signal) {
  try {
    const response = await api.get('/health', { signal })
    const payload = response.data

    if (payload?.success !== true) {
      throw new Error(payload?.message || 'The health check returned an unexpected response.')
    }

    return payload.data
  } catch (error) {
    if (error instanceof Error && error.name === 'CanceledError') {
      throw error
    }

    const message = error.response?.data?.message
      || (error.request
        ? `Unable to reach the API at ${API_BASE_URL}. Confirm the backend is running.`
        : error.message)
    throw new Error(message || 'Unable to reach the ShareGrid API.')
  }
}
