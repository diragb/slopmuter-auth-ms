// Packages:
import { Pool, type QueryResult, type QueryResultRow } from 'pg'
import logger from '../lib/logger'

// Constants:
import { env } from './env'
if (!env.databaseUrl) throw new Error('DATABASE_URL is not set')

// Exports:
export const pool = new Pool({
  connectionString: env.databaseUrl,
})

export const query = <T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params)
}

export const verifyDatabaseConnection = async (): Promise<void> => {
  await pool.query('select 1')
  logger.info('Database connection established')
}

export const closeDatabasePool = async (): Promise<void> => {
  await pool.end()
}
