// Packages:
import { generateRefreshToken, hashToken } from '../../lib/crypto'
import { signAccessToken } from '../../lib/jwt'
import { findOrCreateUserByGoogleIdentity, findUserById } from '../users/user.repository'
import {
  createRefreshToken,
  findActiveRefreshTokenByHash,
  revokeRefreshTokenByHash,
} from '../tokens/refresh-token.repository'
import { exchangeCodeForGoogleIdentity } from '../providers/google-oauth.provider'
import { AuthenticationError } from '../../lib/errors'

// Constants:
import env from '../../config/env'

// Functions:
const getRefreshTokenExpiryDate = () => {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + env.refreshTokenTtlDays)
  return expiresAt
}

const issueSessionForUser = async (input: {
  userId: string
  email: string
  userAgent: string | null
  ipAddress: string | null
}) => {
  const refreshToken = generateRefreshToken()
  const refreshTokenHash = hashToken(refreshToken)

  await createRefreshToken({
    userId: input.userId,
    tokenHash: refreshTokenHash,
    expiresAt: getRefreshTokenExpiryDate(),
    userAgent: input.userAgent ?? null,
    ipAddress: input.ipAddress ?? null,
  })

  const accessToken = signAccessToken({
    sub: input.userId,
    email: input.email,
    type: 'access',
  })

  return {
    accessToken,
    refreshToken,
    expiresIn: 900,
  }
}

const loginWithGoogle = async (input: {
  code: string
  redirectUri: string
  userAgent: string | null
  ipAddress: string | null
}) => {
  const identity = await exchangeCodeForGoogleIdentity({
    code: input.code,
    redirectUri: input.redirectUri,
  })

  if (!identity.emailVerified) throw new AuthenticationError('GOOGLE_EMAIL_UNVERIFIED', 'Google account email is not verified.')

  const user = await findOrCreateUserByGoogleIdentity({
    email: identity.email,
    name: identity.name,
    avatarUrl: identity.avatarUrl,
    providerUserId: identity.providerUserId,
  })

  const session = await issueSessionForUser({
    userId: user.id,
    email: user.email,
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
  })

  return {
    ...session,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
  }
}

const refreshSession = async (input: {
  refreshToken: string
  userAgent: string | null
  ipAddress: string | null
}) => {
  const currentTokenHash = hashToken(input.refreshToken)

  const existingToken = await findActiveRefreshTokenByHash(currentTokenHash)
  if (!existingToken) return null

  const user = await findUserById(existingToken.userId)
  if (!user) return null

  const newRefreshToken = generateRefreshToken()
  const newRefreshTokenHash = hashToken(newRefreshToken)

  await revokeRefreshTokenByHash({
    tokenHash: currentTokenHash,
    replacedByTokenHash: newRefreshTokenHash,
  })

  await createRefreshToken({
    userId: user.id,
    tokenHash: newRefreshTokenHash,
    expiresAt: getRefreshTokenExpiryDate(),
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
  })

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    type: 'access',
  })

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: 900,
  }
}

const logoutSession = async (refreshToken: string) => {
  const tokenHash = hashToken(refreshToken)

  const revoked = await revokeRefreshTokenByHash({
    tokenHash,
    replacedByTokenHash: null,
  })

  return revoked
}

// Exports:
export {
  loginWithGoogle,
  refreshSession,
  logoutSession,
}
