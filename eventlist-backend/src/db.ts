import pg from 'pg'
import { config, verifiedDatabaseUrl } from './config.js'

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required. Add the PostgreSQL connection URL to the backend environment.')
}

export const pool = new pg.Pool({
  connectionString: verifiedDatabaseUrl(config.databaseUrl),
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
})

pool.on('error', (error) => {
  console.error('Unexpected idle Postgres client error:', error.message)
})
