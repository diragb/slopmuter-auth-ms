// Packages:
import { Pool } from 'pg'

// Constants:
import env from './env'
if (!env.databaseUrl) throw new Error('DATABASE_URL is not set')

// Exports:
export const pool = new Pool({
  connectionString: env.databaseUrl,
})
