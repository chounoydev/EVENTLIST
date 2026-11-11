import { loadEnv } from 'vite'

const environment = {
  ...loadEnv('production', process.cwd(), 'VITE_'),
  ...process.env,
}
const apiUrl = environment.VITE_API_URL?.trim()

if (!apiUrl) {
  throw new Error('Set VITE_API_URL to the deployed API base URL ending in /api before building the Android APK.')
}

let parsedUrl
try {
  parsedUrl = new URL(apiUrl)
} catch {
  throw new Error('VITE_API_URL must be a valid absolute URL ending in /api.')
}

if (!['http:', 'https:'].includes(parsedUrl.protocol)
  || !parsedUrl.pathname.replace(/\/+$/, '').endsWith('/api')) {
  throw new Error('VITE_API_URL must use HTTP or HTTPS and end in /api.')
}

if (['localhost', '127.0.0.1'].includes(parsedUrl.hostname)) {
  throw new Error('VITE_API_URL must use a publicly reachable host for the Android APK.')
}

console.log(`Android APK will use API ${parsedUrl.origin}${parsedUrl.pathname.replace(/\/+$/, '')}.`)
