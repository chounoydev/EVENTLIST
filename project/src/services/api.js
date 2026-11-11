import axios from 'axios'

const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim()
const nativeBaseUrl = localStorage.getItem('eventlist_api_url')?.trim()
const isLocalWebDevelopment = !window.Capacitor?.isNativePlatform?.()
  && ['localhost', '127.0.0.1'].includes(window.location.hostname)
const defaultBaseUrl = isLocalWebDevelopment
  ? `${window.location.protocol}//${window.location.hostname}:8000/api`
  : ''
const apiBaseUrl = configuredBaseUrl || nativeBaseUrl || defaultBaseUrl

const api = axios.create({
  baseURL: apiBaseUrl || undefined,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  if (!apiBaseUrl) {
    return Promise.reject(new Error(
      'Eventlist API is not configured. Set VITE_API_URL to the deployed API URL ending in /api, then rebuild the website or APK.',
    ))
  }

  const token = localStorage.getItem('eventlist_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use((response) => {
  const apiOrigin = String(api.defaults.baseURL || '').replace(/\/api\/?$/, '')
  const normalizeUrls = (value) => {
    if (typeof value === 'string') {
      return value.replace(
        /^https?:\/\/(?:127\.0\.0\.1|localhost|192\.168(?:\.\d{1,3}){2})(:\d+)?/,
        apiOrigin,
      )
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        value[index] = normalizeUrls(item)
      })
      return value
    }
    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) => {
        value[key] = normalizeUrls(item)
      })
    }
    return value
  }

  normalizeUrls(response.data)
  return response
})

export default api
