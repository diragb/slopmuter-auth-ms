
// Packages:
import { pool } from '../../config/db'

// Typescript:
interface RefreshTokenRecord {
  id: string
  userId: string
  tokenHash: string
  expiresAt: string
  createdAt: string
  revokedAt: string | null
  replacedByTokenHash: string | null
  userAgent: string | null
  ipAddress: string | null
}

// Functions:
/**
 * Inserts a new refresh token row.
 *
 * @param input.userId - Owner user id.
 * @param input.tokenHash - Hash of the refresh token (never store the raw token).
 * @param input.expiresAt - Expiration time for the refresh token.
 * @param input.userAgent - Optional user agent metadata.
 * @param input.ipAddress - Optional IP address metadata.
 * @returns The inserted refresh token record as returned by the database.
 */
const createRefreshToken = async (input: {
  userId: string
  tokenHash: string
  expiresAt: Date
  userAgent: string | null
  ipAddress: string | null
}) => {
  const result = await pool.query(
    `
      insert into refresh_tokens (
        user_id,
        token_hash,
        expires_at,
        user_agent,
        ip_address
      )
      values ($1, $2, $3, $4, $5)
      returning
        id::text,
        user_id::text as "userId",
        token_hash as "tokenHash",
        expires_at as "expiresAt",
        created_at as "createdAt",
        revoked_at as "revokedAt",
        replaced_by_token_hash as "replacedByTokenHash",
        user_agent as "userAgent",
        ip_address::text as "ipAddress"
    `,
    [
      input.userId,
      input.tokenHash,
      input.expiresAt,
      input.userAgent ?? null,
      input.ipAddress ?? null,
    ]
  )

  return result.rows[0] as RefreshTokenRecord
}

/**
 * Looks up an "active" refresh token by its hash.
 *
 * Active means: not revoked and not expired at query time.
 *
 * @param tokenHash - Hash of the refresh token to look up.
 * @returns The matching refresh token record, or null if none is active.
 */
const findActiveRefreshTokenByHash = async (
  tokenHash: string
): Promise<RefreshTokenRecord | null> => {
  const result = await pool.query(
    `
      select
        id::text,
        user_id::text as "userId",
        token_hash as "tokenHash",
        expires_at as "expiresAt",
        created_at as "createdAt",
        revoked_at as "revokedAt",
        replaced_by_token_hash as "replacedByTokenHash",
        user_agent as "userAgent",
        ip_address::text as "ipAddress"
      from refresh_tokens
      where token_hash = $1
        and revoked_at is null
        and expires_at > now()
      limit 1
    `,
    [tokenHash]
  )

  return result.rows[0] || null
}

/**
 * Revokes a refresh token (idempotent) and optionally marks a replacement hash.
 *
 * This only affects tokens that are currently not revoked.
 *
 * @param input.tokenHash - Hash of the refresh token to revoke.
 * @param input.replacedByTokenHash - Optional hash of the token that replaced it (for rotation).
 * @returns True if a token was revoked; false if no active (non-revoked) token matched.
 */
const revokeRefreshTokenByHash = async (input: {
  tokenHash: string
  replacedByTokenHash: string | null
}) => {
  const result = await pool.query(
    `
      update refresh_tokens
      set
        revoked_at = now(),
        replaced_by_token_hash = $2
      where token_hash = $1
        and revoked_at is null
      returning id::text
    `,
    [input.tokenHash, input.replacedByTokenHash ?? null]
  )

  return (result.rowCount ?? 0) > 0
}

// Exports:
export {
  createRefreshToken,
  findActiveRefreshTokenByHash,
  revokeRefreshTokenByHash,
}
export type { RefreshTokenRecord }
