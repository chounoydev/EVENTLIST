import 'dotenv/config'

const port = Number(process.env.PORT ?? 8000)
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port.')
}

const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost',
  'http://127.0.0.1',
  'capacitor://localhost',
  'https://localhost',
]

const normalizeOrigin = (value?: string) => value?.trim().replace(/\/+$/, '')
const configuredOrigins = [
  normalizeOrigin(process.env.APP_PUBLIC_URL),
  normalizeOrigin(process.env.PUBLIC_API_URL),
  ...((process.env.CORS_ALLOWED_ORIGINS ?? '').split(',').map(normalizeOrigin).filter(Boolean)),
  ...defaultOrigins,
]

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port,
  databaseUrl: process.env.DATABASE_URL,
  databaseUrlUnpooled: process.env.DATABASE_URL_UNPOOLED,
  ownerEmail: (process.env.OWNER_EMAIL ?? 'johndegamo45@gmail.com').trim().toLowerCase(),
  publicApiUrl: normalizeOrigin(process.env.PUBLIC_API_URL)?.replace(/\/api\/?$/, ''),
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  allowedOrigins: [...new Set(configuredOrigins.filter(Boolean))],
}

export function verifiedDatabaseUrl(connectionString: string): string {
  const url = new URL(connectionString)
  if (url.searchParams.get('sslmode') === 'require') {
    url.searchParams.set('sslmode', 'verify-full')
  }
  return url.toString()
}
