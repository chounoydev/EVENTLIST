import nodemailer from 'nodemailer'
import { config } from './config.js'
import { ApiError } from './errors.js'

function createTransport() {
  const host = process.env.SMTP_HOST?.trim()
  const from = process.env.SMTP_FROM?.trim()
  if (!host || !from) {
    throw new ApiError(503, 'Password-reset email is not configured. Set SMTP_HOST and SMTP_FROM.')
  }

  const port = Number(process.env.SMTP_PORT ?? 587)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ApiError(500, 'SMTP_PORT must be a valid TCP port.')
  }

  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD
  return {
    from,
    transport: nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true',
      ...(user && password ? { auth: { user, pass: password } } : {}),
    }),
  }
}

export function passwordResetLink(token: string, email: string): string {
  const baseUrl = config.publicApiUrl ?? `http://localhost:${config.port}`
  const appUrl = process.env.APP_PUBLIC_URL?.trim().replace(/\/+$/, '') ?? baseUrl
  const url = new URL('/', appUrl)
  url.searchParams.set('reset_token', token)
  url.searchParams.set('email', email)
  return url.toString()
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const { from, transport } = createTransport()
  await transport.sendMail({
    from,
    to: email,
    subject: 'Reset your Eventlist password',
    text: `Use this link within 60 minutes to choose a new password:\n\n${passwordResetLink(token, email)}\n\nIf you did not request this, you can ignore this email.`,
  })
}

export function assertPasswordResetEmailConfigured(): void {
  createTransport()
}
