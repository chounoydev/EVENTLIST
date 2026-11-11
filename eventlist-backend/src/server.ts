import { mkdir } from 'node:fs/promises'
import app from './app.js'
import { config } from './config.js'
import { pool } from './db.js'

await mkdir(config.uploadDir, { recursive: true })
await pool.query('SELECT 1')

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`Eventlist API listening on port ${config.port}.`)
})

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}; shutting down.`)
  server.close(async (error) => {
    if (error) {
      console.error('HTTP server shutdown failed:', error.message)
      process.exitCode = 1
    }
    await pool.end()
  })
}

process.once('SIGINT', () => { void shutdown('SIGINT') })
process.once('SIGTERM', () => { void shutdown('SIGTERM') })
