// Packages:
import { pool } from '../../config/db'

// Typescript:
interface User {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  twitterUsername: string | null
  accountsReportedCount: number
  successfulReportsCount: number
  reputationPoints: number
  subscriptionTier: string
  authProvider: string
  providerUserId: string
  createdAt: Date
  updatedAt: Date
  lastActiveAt: Date | null
  lastReportAt: Date | null
  lastMonthlyRepAwardedAt: Date | null
}

// Functions:
const findUserById = async (userId: string): Promise<User | null> => {
  const result = await pool.query(
    `
      select
        id::text,
        email,
        name,
        avatar_url as "avatarUrl",
        auth_provider as "authProvider",
        provider_user_id as "providerUserId"
      from users
      where id = $1
      limit 1
    `,
    [userId]
  )

  return result.rows[0] || null
}

// Exports:
export { findUserById }
export type { User }
