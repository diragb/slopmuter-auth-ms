// Packages:
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'

// Variables:
let container: Awaited<ReturnType<PostgreSqlContainer['start']>> | null = null
let pool: Pool | null = null

// Exports:
export const startTestDatabase = async (): Promise<Pool> => {
  if (pool) return pool

  const postgres = new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('test_db')
    .withUsername('test')
    .withPassword('test')

  container = await postgres.start()
  const connectionUri = container.getConnectionUri()

  pool = new Pool({ connectionString: connectionUri })

  const migrationsDir = path.join(__dirname, '..', '..', '..', 'slopmuter-infra', 'migrations')
  const files = fs
    .readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()

  const client = await pool.connect()
  try {
    for (const file of files) {
      const filePath = path.join(migrationsDir, file)
      const sql = fs.readFileSync(filePath, 'utf8')
      await client.query(sql)
    }
  } finally {
    client.release()
  }

  return pool
}

export const stopTestDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end()
    pool = null
  }
  if (container) {
    await container.stop()
    container = null
  }
}

export const getTestPool = (): Pool | null => pool

export const cleanTables = async (): Promise<void> => {
  if (!pool) return
  await pool.query('TRUNCATE refresh_tokens, users RESTART IDENTITY CASCADE')
}
