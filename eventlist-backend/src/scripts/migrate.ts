import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import pg from 'pg'
import { config, verifiedDatabaseUrl } from '../config.js'

const connectionString = config.databaseUrlUnpooled ?? config.databaseUrl
if (!connectionString) {
  throw new Error('Set DATABASE_URL_UNPOOLED or DATABASE_URL before running migrations.')
}

const client = new pg.Client({ connectionString: verifiedDatabaseUrl(connectionString) })

try {
  await client.connect()
  await client.query('BEGIN')
  await client.query('CREATE SCHEMA IF NOT EXISTS eventlist')
  await client.query("SELECT pg_advisory_xact_lock(hashtext('eventlist-schema-migrations'))")
  await client.query(`CREATE TABLE IF NOT EXISTS eventlist.schema_migrations (
    version VARCHAR(100) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`)

  for (const version of ['001_initial', '002_event_coordinates']) {
    const applied = await client.query('SELECT 1 FROM eventlist.schema_migrations WHERE version = $1', [version])
    if (applied.rowCount === 0) {
      const migration = await readFile(resolve(process.cwd(), 'migrations', `${version}.sql`), 'utf8')
      await client.query(migration)
      await client.query('INSERT INTO eventlist.schema_migrations (version) VALUES ($1)', [version])
      console.log(`Applied database migration ${version}.`)
    } else {
      console.log(`Database migration ${version} is already applied.`)
    }
  }

  await client.query('COMMIT')
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined)
  throw error
} finally {
  await client.end()
}
