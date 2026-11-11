import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { NextFunction, Request, Response } from 'express'
import { pool } from './db.js'
import { ApiError, asyncHandler } from './errors.js'
import type { AuthUser } from './types.js'

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function createToken(): string {
  return randomBytes(32).toString('hex')
}

export function issueToken(userId: number): Promise<{ token: string }> {
  const token = createToken()
  return pool.query(
    `INSERT INTO eventlist.auth_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
    [userId, hashToken(token)],
  ).then(() => ({ token }))
}

export const authenticate = asyncHandler(async (request: Request, _response: Response, next: NextFunction) => {
  const [scheme, token] = (request.get('authorization') ?? '').split(' ')
  if (scheme !== 'Bearer' || !token || token.length > 256) {
    throw new ApiError(401, 'Unauthenticated.')
  }

  const result = await pool.query<{ token_id: number; user: AuthUser }>(
    `SELECT auth_tokens.id AS token_id,
            json_build_object(
              'id', users.id,
              'name', users.name,
              'email', users.email,
              'role', users.role,
              'is_active', users.is_active,
              'created_at', users.created_at,
              'updated_at', users.updated_at
            ) AS user
     FROM eventlist.auth_tokens AS auth_tokens
     JOIN eventlist.users AS users ON users.id = auth_tokens.user_id
     WHERE auth_tokens.token_hash = $1 AND auth_tokens.expires_at > NOW()`,
    [hashToken(token)],
  )

  const row = result.rows[0]
  if (!row || !row.user.is_active) {
    throw new ApiError(401, 'Unauthenticated.')
  }

  request.auth = { user: row.user, tokenId: row.token_id }
  await pool.query('UPDATE eventlist.auth_tokens SET last_used_at = NOW() WHERE id = $1', [row.token_id])
  next()
})

export function requireAdmin(request: Request, _response: Response, next: NextFunction): void {
  if (request.auth?.user.role !== 'admin' && request.auth?.user.role !== 'owner') {
    next(new ApiError(403, 'Administrator access is required.'))
    return
  }
  next()
}

export function requireOwner(request: Request, _response: Response, next: NextFunction): void {
  if (request.auth?.user.role !== 'owner') {
    next(new ApiError(403, 'Only the portal owner can manage administrators.'))
    return
  }
  next()
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash)
}
