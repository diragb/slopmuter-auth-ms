// Packages:
import { pool } from '../../config/db'

// Typescript:
interface User {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  authProvider: string
  providerUserId: string
}

// Functions:
const mapUserRow = (row: any): User => {
  return {
    id: String(row.id),
    email: row.email,
    name: row.name,
    avatarUrl: row.avatarUrl,
    authProvider: row.authProvider,
    providerUserId: row.providerUserId,
  }
}

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

  if (result.rowCount === 0) return null
  return mapUserRow(result.rows[0])
}

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
    [input.authProvider, input.providerUserId]
  )

  if (result.rowCount === 0) return null
  return mapUserRow(result.rows[0])
}

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
    [
      input.email,
      input.name,
      input.avatarUrl,
      input.authProvider,
      input.providerUserId,
    ]
  )

  return mapUserRow(result.rows[0])
}

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
export {
  findUserById,
  findUserByProviderIdentity,
  createUser,
  findOrCreateUserByGoogleIdentity,
}
export type { User }
