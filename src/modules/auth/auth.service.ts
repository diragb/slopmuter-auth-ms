// Packages:
import { generateRefreshToken, hashToken } from '../../lib/crypto'
import { signAccessToken } from '../../lib/jwt'
import { findUserById } from '../users/user.repository'
import {
  createRefreshToken,
  findActiveRefreshTokenByHash,
  revokeRefreshTokenByHash,
} from '../tokens/refresh-token.repository'

// Constants:
import env from '../../config/env'

// Functions:
const getRefreshTokenExpiryDate = () => {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + env.refreshTokenTtlDays)
  return expiresAt
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
  })

  return revoked
}

// Exports:
export { refreshSession, logoutSession }
