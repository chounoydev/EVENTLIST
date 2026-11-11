import { z } from 'zod'
import { MAX_BCRYPT_PASSWORD_BYTES } from './passwordPolicy.js'

const emailSchema = z.string().trim().email().max(255).transform((email) => email.toLowerCase())
const passwordWithinBcryptLimit = (password: string) =>
  Buffer.byteLength(password, 'utf8') <= MAX_BCRYPT_PASSWORD_BYTES
const passwordSchema = z.string().min(8).max(255).refine(passwordWithinBcryptLimit, {
  message: `Password must not exceed ${MAX_BCRYPT_PASSWORD_BYTES} UTF-8 bytes.`,
})
const confirmationSchema = {
  password_confirmation: z.string().min(1),
}

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(255),
})

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: emailSchema,
  password: passwordSchema,
  ...confirmationSchema,
}).refine((value) => value.password === value.password_confirmation, {
  path: ['password_confirmation'],
  message: 'The password confirmation does not match.',
})

export const forgotPasswordSchema = z.object({ email: emailSchema })

export const resetPasswordSchema = z.object({
  email: emailSchema,
  token: z.string().min(1).max(256),
  password: passwordSchema,
  ...confirmationSchema,
}).refine((value) => value.password === value.password_confirmation, {
  path: ['password_confirmation'],
  message: 'The password confirmation does not match.',
})

const requiredText = (max: number) => z.string().trim().min(1).max(max)
const nullableText = (max: number) => z.preprocess(
  (value) => value === '' || value === undefined ? null : value,
  z.string().trim().max(max).nullable(),
)
const booleanValue = z.preprocess((value) => {
  if (value === '1' || value === 'true') return true
  if (value === '0' || value === 'false') return false
  return value
}, z.boolean())
const integerValue = (minimum: number, maximum: number) => z.preprocess(
  (value) => typeof value === 'string' && value.trim() !== '' ? Number(value) : value,
  z.number().int().min(minimum).max(maximum),
)
const coordinateValue = (minimum: number, maximum: number) => z.preprocess(
  (value) => value === '' || value === undefined ? null
    : typeof value === 'string' ? Number(value) : value,
  z.number().finite().min(minimum).max(maximum).nullable(),
)

export const eventSchema = z.object({
  title: requiredText(255),
  description: nullableText(10000).optional(),
  location: requiredText(255),
  latitude: coordinateValue(-90, 90),
  longitude: coordinateValue(-180, 180),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  }, 'Enter a valid event date.'),
  event_time: z.preprocess(
    (value) => value === '' || value === undefined ? null : value,
    z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/).nullable(),
  ),
  organizer: nullableText(255).optional(),
  capacity: integerValue(0, 2_147_483_647),
  remove_image: booleanValue.optional().default(false),
}).refine(
  (value) => (value.latitude === null) === (value.longitude === null),
  { path: ['latitude'], message: 'Select a precise location so both coordinates are saved.' },
)

export const heroSlideSchema = z.object({
  eyebrow: requiredText(100),
  title: requiredText(160),
  description: requiredText(500),
  art_text: requiredText(80),
  symbol: z.string().trim().min(1).max(12),
  sort_order: integerValue(0, 999),
  is_active: booleanValue,
})

export const createAdminSchema = z.object({
  name: requiredText(255),
  email: emailSchema,
  password: z.string().min(12).max(255).regex(/[a-z]/, 'The password must contain a lowercase letter.')
    .regex(/[A-Z]/, 'The password must contain an uppercase letter.')
    .regex(/\d/, 'The password must contain a number.')
    .regex(/[^A-Za-z0-9]/, 'The password must contain a symbol.')
    .refine(passwordWithinBcryptLimit, {
      message: `Password must not exceed ${MAX_BCRYPT_PASSWORD_BYTES} UTF-8 bytes.`,
    }),
  ...confirmationSchema,
}).refine((value) => value.password === value.password_confirmation, {
  path: ['password_confirmation'],
  message: 'The password confirmation does not match.',
})
