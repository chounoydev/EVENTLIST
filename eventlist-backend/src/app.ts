import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import cors from 'cors'
import express, { type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import { fileTypeFromBuffer } from 'file-type'
import helmet from 'helmet'
import multer from 'multer'
import {
  authenticate,
  createToken,
  hashPassword,
  hashToken,
  issueToken,
  requireAdmin,
  requireOwner,
  verifyPassword,
} from './auth.js'
import { config } from './config.js'
import { pool } from './db.js'
import { ApiError, asyncHandler, errorHandler, parseBody } from './errors.js'
import { assertPasswordResetEmailConfigured, sendPasswordResetEmail } from './mailer.js'
import {
  createAdminSchema,
  eventSchema,
  forgotPasswordSchema,
  heroSlideSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './validation.js'

interface EventRow {
  id: number
  title: string
  description: string | null
  location: string
  latitude: number | null
  longitude: number | null
  event_date: string
  event_time: string | null
  organizer: string | null
  capacity: number
  image_path: string | null
  created_at: Date
  updated_at: Date
}

const app = express()
const uploadRoot = path.resolve(config.uploadDir)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) {
      callback(new ApiError(422, 'Choose a JPG, PNG, GIF, or WebP image.'))
      return
    }
    callback(null, true)
  },
})

app.set('trust proxy', 1)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
      callback(null, true)
      return
    }
    callback(new Error(`CORS: Origin is not allowed.`))
  },
}))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false, limit: '1mb' }))
app.use('/storage', express.static(uploadRoot, { fallthrough: false, index: false, maxAge: '1h' }))

const loginLimiter = rateLimit({
  windowMs: 60_000,
  limit: 6,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again in a minute.' },
})
const resetLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many password reset attempts. Please try again in a minute.' },
})

function apiOrigin(request: Request): string {
  if (config.publicApiUrl) return config.publicApiUrl.replace(/\/api\/?$/, '')
  return `${request.protocol}://${request.get('host')}`
}

function eventResponse(request: Request, row: EventRow) {
  return {
    ...row,
    image_url: row.image_path ? `${apiOrigin(request)}/storage/${row.image_path}` : null,
  }
}

async function saveCoverImage(file: Express.Multer.File | undefined): Promise<string | null> {
  if (!file) return null
  const detected = await fileTypeFromBuffer(file.buffer)
  const allowedTypes = new Map([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/gif', 'gif'],
    ['image/webp', 'webp'],
  ])
  const extension = detected ? allowedTypes.get(detected.mime) : undefined
  if (!extension) {
    throw new ApiError(422, 'The uploaded file is not a supported image.')
  }

  const relativePath = `events/${randomUUID()}.${extension}`
  const absolutePath = path.join(uploadRoot, relativePath)
  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, file.buffer, { flag: 'wx' })
  return relativePath
}

async function deleteCoverImage(imagePath: string | null): Promise<void> {
  if (!imagePath || !imagePath.startsWith('events/')) return
  const absolutePath = path.resolve(uploadRoot, imagePath)
  if (!absolutePath.startsWith(`${uploadRoot}${path.sep}`)) return
  await unlink(absolutePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error
  })
}

function validId(value: string | string[]): number {
  if (Array.isArray(value)) throw new ApiError(404, 'The requested record was not found.')
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) throw new ApiError(404, 'The requested record was not found.')
  return id
}

function safeUser(row: Record<string, unknown>) {
  const { password_hash: _passwordHash, ...user } = row
  return user
}

app.get('/api/health', asyncHandler(async (_request, response) => {
  await pool.query('SELECT 1')
  response.json({ status: 'ok' })
}))

app.post('/api/login', loginLimiter, asyncHandler(async (request, response) => {
  const input = parseBody(loginSchema, request.body)
  const result = await pool.query(
    `SELECT id, name, email, password_hash, role, is_active, created_at, updated_at
     FROM eventlist.users WHERE email = $1`,
    [input.email],
  )
  const user = result.rows[0]
  if (!user || !user.is_active || !(await verifyPassword(input.password, user.password_hash))) {
    throw new ApiError(422, 'The provided credentials are incorrect.', { email: ['The provided credentials are incorrect.'] })
  }
  const { token } = await issueToken(user.id)
  response.json({ user: safeUser(user), token })
}))

app.post('/api/register', loginLimiter, asyncHandler(async (request, response) => {
  const input = parseBody(registerSchema, request.body)
  if (input.email === config.ownerEmail) {
    throw new ApiError(422, 'This email is reserved for the Eventlist portal owner.', {
      email: ['This email is reserved for the Eventlist portal owner.'],
    })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const passwordHash = await hashPassword(input.password)
    const result = await client.query(
      `INSERT INTO eventlist.users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'user', TRUE)
       RETURNING id, name, email, role, is_active, created_at, updated_at`,
      [input.name, input.email, passwordHash],
    )
    const token = createToken()
    await client.query(
      `INSERT INTO eventlist.auth_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [result.rows[0].id, hashToken(token)],
    )
    await client.query('COMMIT')
    response.status(201).json({ user: result.rows[0], token })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}))

app.post('/api/forgot-password', resetLimiter, asyncHandler(async (request, response) => {
  const { email } = parseBody(forgotPasswordSchema, request.body)
  assertPasswordResetEmailConfigured()
  const result = await pool.query(
    'SELECT id FROM eventlist.users WHERE email = $1 AND is_active = TRUE',
    [email],
  )
  if (result.rowCount) {
    const token = createToken()
    await pool.query(
      `INSERT INTO eventlist.password_reset_tokens (email, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '60 minutes')
       ON CONFLICT (email) DO UPDATE
       SET token_hash = EXCLUDED.token_hash,
           expires_at = EXCLUDED.expires_at,
           created_at = NOW()`,
      [email, hashToken(token)],
    )
    try {
      await sendPasswordResetEmail(email, token)
    } catch (error) {
      await pool.query('DELETE FROM eventlist.password_reset_tokens WHERE email = $1', [email])
      throw error
    }
  }
  response.json({ message: 'If an active account exists for that email, a password reset link has been sent.' })
}))

app.post('/api/reset-password', resetLimiter, asyncHandler(async (request, response) => {
  const input = parseBody(resetPasswordSchema, request.body)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const reset = await client.query(
      `SELECT email FROM eventlist.password_reset_tokens
       WHERE email = $1 AND token_hash = $2 AND expires_at > NOW()
       FOR UPDATE`,
      [input.email, hashToken(input.token)],
    )
    if (!reset.rowCount) throw new ApiError(422, 'This password reset link is invalid or has expired.')
    const user = await client.query(
      'SELECT id FROM eventlist.users WHERE email = $1 AND is_active = TRUE FOR UPDATE',
      [input.email],
    )
    if (!user.rowCount) throw new ApiError(422, 'This password reset link is invalid or has expired.')
    const passwordHash = await hashPassword(input.password)
    await client.query(
      'UPDATE eventlist.users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, user.rows[0].id],
    )
    await client.query('DELETE FROM eventlist.auth_tokens WHERE user_id = $1', [user.rows[0].id])
    await client.query('DELETE FROM eventlist.password_reset_tokens WHERE email = $1', [input.email])
    await client.query('COMMIT')
    response.json({ message: 'Your password has been reset. You can now sign in.' })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}))

app.get('/api/public/events', asyncHandler(async (request, response) => {
  const result = await pool.query<EventRow>(
    'SELECT * FROM eventlist.events ORDER BY event_date, event_time NULLS LAST, id',
  )
  response.json({ data: result.rows.map((row) => eventResponse(request, row)) })
}))

app.get('/api/public/slides', asyncHandler(async (_request, response) => {
  const result = await pool.query(
    `SELECT * FROM eventlist.hero_slides
     WHERE is_active = TRUE ORDER BY sort_order, id`,
  )
  response.json({ data: result.rows })
}))

app.use('/api/events', authenticate, requireAdmin)
app.use('/api/admin', authenticate, requireAdmin)

app.get('/api/user', authenticate, (request, response) => {
  response.json(request.auth!.user)
})

app.post('/api/logout', authenticate, asyncHandler(async (request, response) => {
  await pool.query('DELETE FROM eventlist.auth_tokens WHERE id = $1', [request.auth!.tokenId])
  response.json({ message: 'Logged out successfully.' })
}))

app.get('/api/events', asyncHandler(async (request, response) => {
  const result = await pool.query<EventRow>(
    'SELECT * FROM eventlist.events ORDER BY event_date, event_time NULLS LAST, id',
  )
  response.json({ data: result.rows.map((row) => eventResponse(request, row)) })
}))

app.post('/api/events', upload.single('cover_image'), asyncHandler(async (request, response) => {
  const input = parseBody(eventSchema, request.body)
  const imagePath = await saveCoverImage(request.file)
  try {
    const result = await pool.query<EventRow>(
      `INSERT INTO eventlist.events
       (title, description, location, latitude, longitude, event_date, event_time, organizer, capacity, image_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [input.title, input.description, input.location, input.latitude, input.longitude,
        input.event_date, input.event_time, input.organizer, input.capacity, imagePath],
    )
    response.status(201).json({ data: eventResponse(request, result.rows[0]) })
  } catch (error) {
    await deleteCoverImage(imagePath)
    throw error
  }
}))

const updateEvent = asyncHandler(async (request, response) => {
  const id = validId(request.params.id)
  const input = parseBody(eventSchema, request.body)
  const existing = await pool.query<EventRow>('SELECT * FROM eventlist.events WHERE id = $1', [id])
  if (!existing.rowCount) throw new ApiError(404, 'The requested event was not found.')

  const previousImage = existing.rows[0].image_path
  const newImage = await saveCoverImage(request.file)
  const imagePath = newImage ?? (input.remove_image ? null : previousImage)
  let updated: EventRow
  try {
    const result = await pool.query<EventRow>(
      `UPDATE eventlist.events
       SET title = $1, description = $2, location = $3, latitude = $4, longitude = $5,
           event_date = $6, event_time = $7, organizer = $8, capacity = $9,
           image_path = $10, updated_at = NOW()
       WHERE id = $11 RETURNING *`,
      [input.title, input.description, input.location, input.latitude, input.longitude,
        input.event_date, input.event_time, input.organizer, input.capacity, imagePath, id],
    )
    updated = result.rows[0]
  } catch (error) {
    await deleteCoverImage(newImage)
    throw error
  }
  if (previousImage && imagePath !== previousImage) await deleteCoverImage(previousImage)
  response.json({ data: eventResponse(request, updated) })
})

app.put('/api/events/:id', upload.single('cover_image'), updateEvent)
app.patch('/api/events/:id', upload.single('cover_image'), updateEvent)
app.post('/api/events/:id', upload.single('cover_image'), updateEvent)

app.delete('/api/events/:id', asyncHandler(async (request, response) => {
  const id = validId(request.params.id)
  const result = await pool.query<EventRow>('DELETE FROM eventlist.events WHERE id = $1 RETURNING *', [id])
  if (!result.rowCount) throw new ApiError(404, 'The requested event was not found.')
  await deleteCoverImage(result.rows[0].image_path)
  response.json({ message: 'Event deleted successfully.' })
}))

app.get('/api/admin/slides', asyncHandler(async (_request, response) => {
  const result = await pool.query('SELECT * FROM eventlist.hero_slides ORDER BY sort_order, id')
  response.json({ data: result.rows })
}))

app.post('/api/admin/slides', asyncHandler(async (request, response) => {
  const input = parseBody(heroSlideSchema, request.body)
  const result = await pool.query(
    `INSERT INTO eventlist.hero_slides
     (eyebrow, title, description, art_text, symbol, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [input.eyebrow, input.title, input.description, input.art_text,
      input.symbol, input.sort_order, input.is_active],
  )
  response.status(201).json({ data: result.rows[0] })
}))

app.put('/api/admin/slides/:id', asyncHandler(async (request, response) => {
  const id = validId(request.params.id)
  const input = parseBody(heroSlideSchema, request.body)
  const result = await pool.query(
    `UPDATE eventlist.hero_slides SET eyebrow = $1, title = $2, description = $3,
       art_text = $4, symbol = $5, sort_order = $6, is_active = $7, updated_at = NOW()
     WHERE id = $8 RETURNING *`,
    [input.eyebrow, input.title, input.description, input.art_text,
      input.symbol, input.sort_order, input.is_active, id],
  )
  if (!result.rowCount) throw new ApiError(404, 'The requested hero slide was not found.')
  response.json({ data: result.rows[0] })
}))

app.delete('/api/admin/slides/:id', asyncHandler(async (request, response) => {
  const id = validId(request.params.id)
  const result = await pool.query('DELETE FROM eventlist.hero_slides WHERE id = $1', [id])
  if (!result.rowCount) throw new ApiError(404, 'The requested hero slide was not found.')
  response.json({ message: 'Hero slide deleted successfully.' })
}))

app.get('/api/admin/admins', requireOwner, asyncHandler(async (_request, response) => {
  const result = await pool.query(
    `SELECT id, name, email, role, is_active, created_at FROM eventlist.users
     WHERE role IN ('owner', 'admin')
     ORDER BY CASE WHEN role = 'owner' THEN 0 ELSE 1 END, name`,
  )
  response.json({ data: result.rows })
}))

app.post('/api/admin/admins', requireOwner, resetLimiter, asyncHandler(async (request, response) => {
  const input = parseBody(createAdminSchema, request.body)
  const passwordHash = await hashPassword(input.password)
  const result = await pool.query(
    `INSERT INTO eventlist.users (name, email, password_hash, role, is_active)
     VALUES ($1, $2, $3, 'admin', TRUE)
     RETURNING id, name, email, role, is_active, created_at`,
    [input.name, input.email, passwordHash],
  )
  response.status(201).json({ data: result.rows[0] })
}))

app.delete('/api/admin/admins/:id', requireOwner, asyncHandler(async (request, response) => {
  const id = validId(request.params.id)
  if (id === request.auth!.user.id) {
    throw new ApiError(422, 'You cannot remove your own administrator account.')
  }
  const result = await pool.query(
    `DELETE FROM eventlist.users WHERE id = $1 AND role = 'admin' RETURNING id`,
    [id],
  )
  if (!result.rowCount) {
    const user = await pool.query('SELECT role FROM eventlist.users WHERE id = $1', [id])
    if (user.rows[0]?.role === 'owner') {
      throw new ApiError(422, 'The portal owner cannot be removed.')
    }
    throw new ApiError(404, 'The requested administrator was not found.')
  }
  response.json({ message: 'Administrator removed successfully.' })
}))

app.use('/api', (_request, _response, next) => next(new ApiError(404, 'API endpoint not found.')))
app.use(errorHandler)

export default app
