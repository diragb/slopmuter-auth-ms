// Packages:
import { pool } from '../../config/db'

// Typescript:
import type { QueryResultRow } from 'pg'

interface User {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  authProvider: string
  providerUserId: string
}

// Functions:
/**
 * Maps a raw database row to a User object.
 *
 * @param row - Raw row from the database query result.
 * @returns A User object with properly typed fields.
 */
const mapUserRow = (row: QueryResultRow): User => {
  return {
    id: String(row['id']),
    email: row['email'],
    name: row['name'],
    avatarUrl: row['avatarUrl'],
    authProvider: row['authProvider'],
    providerUserId: row['providerUserId'],
  }
}

/**
 * Finds a user by their internal ID.
 *
 * @param userId - The internal user ID to look up.
 * @returns The matching user, or null if not found.
 */
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
    [userId],
  )

  if (result.rowCount === 0) return null
  return mapUserRow(result.rows[0])
}

/**
 * Finds a user by their OAuth provider and provider-specific user ID.
 *
 * @param input.authProvider - The OAuth provider (e.g., 'google').
 * @param input.providerUserId - The user's ID from the OAuth provider.
 * @returns The matching user, or null if not found.
 */
const findUserByProviderIdentity = async (input: {
  authProvider: string
  providerUserId: string
}): Promise<User | null> => {
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
      where auth_provider = $1
        and provider_user_id = $2
      limit 1
    `,
    [input.authProvider, input.providerUserId],
  )

  if (result.rowCount === 0) return null
  return mapUserRow(result.rows[0])
}

/**
 * Creates a new user in the database.
 *
 * @param input.email - The user's email address.
 * @param input.name - The user's display name (optional).
 * @param input.avatarUrl - URL to the user's avatar image (optional).
 * @param input.authProvider - The OAuth provider used for authentication.
 * @param input.providerUserId - The user's ID from the OAuth provider.
 * @returns The newly created user.
 */
const createUser = async (input: {
  email: string
  name: string | null
  avatarUrl: string | null
  authProvider: string
  providerUserId: string
}): Promise<User> => {
  const result = await pool.query(
    `
      insert into users (
        email,
        name,
        avatar_url,
        auth_provider,
        provider_user_id
      )
      values ($1, $2, $3, $4, $5)
      returning
        id::text,
        email,
        name,
        avatar_url as "avatarUrl",
        auth_provider as "authProvider",
        provider_user_id as "providerUserId"
    `,
    [input.email, input.name, input.avatarUrl, input.authProvider, input.providerUserId],
  )

  return mapUserRow(result.rows[0])
}

/**
 * Finds an existing user by Google identity, or creates a new user if not found.
 *
 * This is the primary method for handling Google OAuth sign-in/sign-up.
 *
 * @param input.email - The user's email from Google.
 * @param input.name - The user's display name from Google (optional).
 * @param input.avatarUrl - The user's profile picture URL from Google (optional).
 * @param input.providerUserId - The user's Google ID (sub claim).
 * @returns The existing or newly created user.
 */
const findOrCreateUserByGoogleIdentity = async (input: {
  email: string
  name: string | null
  avatarUrl: string | null
  providerUserId: string
}): Promise<User> => {
  const existingUser = await findUserByProviderIdentity({
    authProvider: 'google',
    providerUserId: input.providerUserId,
  })

  if (existingUser) return existingUser
  return createUser({
    email: input.email,
    name: input.name,
    avatarUrl: input.avatarUrl,
    authProvider: 'google',
    providerUserId: input.providerUserId,
  })
}

// Exports:
export { findUserById, findUserByProviderIdentity, createUser, findOrCreateUserByGoogleIdentity }
export type { User }
