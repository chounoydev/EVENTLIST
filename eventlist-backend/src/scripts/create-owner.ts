import { config } from '../config.js'
import { hashPassword } from '../auth.js'
import { pool } from '../db.js'
import { MAX_BCRYPT_PASSWORD_BYTES } from '../passwordPolicy.js'

const name = process.env.OWNER_NAME?.trim() || 'Eventlist Owner'
const password = process.env.OWNER_PASSWORD

try {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const existing = await client.query(
      'SELECT id FROM eventlist.users WHERE email = $1 FOR UPDATE',
      [config.ownerEmail],
    )

    if (existing.rowCount) {
      await client.query(
        `UPDATE eventlist.users
         SET name = CASE WHEN $1 = '' THEN name ELSE $1 END,
             role = 'owner',
             updated_at = NOW()
         WHERE id = $2`,
        [process.env.OWNER_NAME?.trim() ?? '', existing.rows[0].id],
      )
      await client.query('COMMIT')
      console.log(`Portal owner is ready: ${config.ownerEmail}; existing password preserved.`)
    } else {
      if (!password) {
        throw new Error('Set OWNER_PASSWORD in the environment to create the initial portal owner.')
      }
      if (password.length < 12 || Buffer.byteLength(password, 'utf8') > MAX_BCRYPT_PASSWORD_BYTES ||
          !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        throw new Error(`OWNER_PASSWORD must be at least 12 characters, no more than ${MAX_BCRYPT_PASSWORD_BYTES} UTF-8 bytes, and include lower/uppercase letters, a number, and a symbol.`)
      }

      const passwordHash = await hashPassword(password)
      await client.query(
        `INSERT INTO eventlist.users (name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, 'owner', TRUE)
         ON CONFLICT (email) DO UPDATE
         SET role = 'owner',
             updated_at = NOW()`,
        [name, config.ownerEmail, passwordHash],
      )
      await client.query('COMMIT')
      console.log(`Portal owner is ready: ${config.ownerEmail}`)
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
} finally {
  await pool.end()
}
