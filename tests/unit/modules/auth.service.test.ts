// Packages:
import { vi } from 'vitest'
import {
  refreshSession,
  loginWithGoogle,
  logoutSession,
} from '../../../src/modules/auth/auth.service'
import { AuthenticationError } from '../../../src/lib/errors'
import { hashToken } from '../../../src/lib/crypto'
import { findUserById, findOrCreateUserByGoogleIdentity } from '../../../src/modules/users/user.repository'
import {
  createRefreshToken,
  findActiveRefreshTokenByHash,
  revokeRefreshTokenByHash,
} from '../../../src/modules/tokens/refresh-token.repository'
import { exchangeCodeForGoogleIdentity } from '../../../src/modules/providers/google-oauth.provider'

// Mocks:
const mockFindUserById = vi.mocked(findUserById)
const mockFindOrCreateUserByGoogleIdentity = vi.mocked(findOrCreateUserByGoogleIdentity)
const mockCreateRefreshToken = vi.mocked(createRefreshToken)
const mockFindActiveRefreshTokenByHash = vi.mocked(findActiveRefreshTokenByHash)
const mockRevokeRefreshTokenByHash = vi.mocked(revokeRefreshTokenByHash)
const mockExchangeCodeForGoogleIdentity = vi.mocked(exchangeCodeForGoogleIdentity)
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: 'https://example.com/avatar.png',
  authProvider: 'google',
  providerUserId: 'google-123',
}

const mockTokenRecord = {
  id: 'token-1',
  userId: 'user-1',
  tokenHash: 'hash',
  expiresAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  revokedAt: null,
  replacedByTokenHash: null,
  userAgent: null,
  ipAddress: null,
}

vi.mock('../../../src/modules/users/user.repository', () => ({
  findUserById: vi.fn(),
  findOrCreateUserByGoogleIdentity: vi.fn(),
}))

vi.mock('../../../src/modules/tokens/refresh-token.repository', () => ({
  createRefreshToken: vi.fn(),
  findActiveRefreshTokenByHash: vi.fn(),
  revokeRefreshTokenByHash: vi.fn(),
}))

vi.mock('../../../src/modules/providers/google-oauth.provider', () => ({
  exchangeCodeForGoogleIdentity: vi.fn(),
}))

// Tests:
beforeEach(() => {
  vi.clearAllMocks()
})

describe('auth.service', () => {
  describe('refreshSession', () => {
    it('returns null when findActiveRefreshTokenByHash returns null', async () => {
      mockFindActiveRefreshTokenByHash.mockResolvedValue(null)

      const result = await refreshSession({
        refreshToken: 'any-token',
        userAgent: null,
        ipAddress: null,
      })

      expect(result).toBeNull()
      expect(mockFindUserById).not.toHaveBeenCalled()
    })

    it('returns null when findUserById returns null', async () => {
      mockFindActiveRefreshTokenByHash.mockResolvedValue(mockTokenRecord)
      mockFindUserById.mockResolvedValue(null)

      const result = await refreshSession({
        refreshToken: 'valid-token',
        userAgent: null,
        ipAddress: null,
      })

      expect(result).toBeNull()
      expect(mockRevokeRefreshTokenByHash).not.toHaveBeenCalled()
    })

    it('rotates token and returns new access + refresh on valid token', async () => {
      const tokenHash = hashToken('valid-token')
      mockFindActiveRefreshTokenByHash.mockResolvedValue({
        ...mockTokenRecord,
        tokenHash,
      })
      mockFindUserById.mockResolvedValue(mockUser)
      mockRevokeRefreshTokenByHash.mockResolvedValue(true)
      mockCreateRefreshToken.mockResolvedValue({
        ...mockTokenRecord,
        id: 'token-2',
      })

      const result = await refreshSession({
        refreshToken: 'valid-token',
        userAgent: null,
        ipAddress: null,
      })

      expect(result).not.toBeNull()
      expect(result?.accessToken).toBeDefined()
      expect(result?.refreshToken).toBeDefined()
      expect(result?.expiresIn).toBe(900)
      expect(mockRevokeRefreshTokenByHash).toHaveBeenCalledWith({
        tokenHash,
        replacedByTokenHash: expect.any(String),
      })
      expect(mockCreateRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          userAgent: null,
          ipAddress: null,
        })
      )
    })
  })

  describe('loginWithGoogle', () => {
    it('throws AuthenticationError when Google email is not verified', async () => {
      mockExchangeCodeForGoogleIdentity.mockResolvedValue({
        provider: 'google',
        providerUserId: 'google-123',
        email: 'test@example.com',
        emailVerified: false,
        name: 'Test',
        avatarUrl: null,
      })

      await expect(
        loginWithGoogle({
          code: 'auth-code',
          redirectUri: 'http://localhost:3000/auth/google/callback',
          userAgent: null,
          ipAddress: null,
        })
      ).rejects.toThrow(AuthenticationError)

      expect(mockFindOrCreateUserByGoogleIdentity).not.toHaveBeenCalled()
    })

    it('calls findOrCreateUserByGoogleIdentity and returns user + tokens on success', async () => {
      mockExchangeCodeForGoogleIdentity.mockResolvedValue({
        provider: 'google',
        providerUserId: 'google-123',
        email: 'test@example.com',
        emailVerified: true,
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
      })
      mockFindOrCreateUserByGoogleIdentity.mockResolvedValue(mockUser)
      mockCreateRefreshToken.mockResolvedValue({
        ...mockTokenRecord,
      })

      const result = await loginWithGoogle({
        code: 'auth-code',
        redirectUri: 'http://localhost:3000/auth/google/callback',
        userAgent: null,
        ipAddress: null,
      })

      expect(mockFindOrCreateUserByGoogleIdentity).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
        providerUserId: 'google-123',
      })
      expect(result.user).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
      })
      expect(result.accessToken).toBeDefined()
      expect(result.refreshToken).toBeDefined()
      expect(result.expiresIn).toBe(900)
    })
  })

  describe('logoutSession', () => {
    it('calls revokeRefreshTokenByHash with hashed token and replacedByTokenHash null', async () => {
      mockRevokeRefreshTokenByHash.mockResolvedValue(true)
      const token = 'my-refresh-token'
      const expectedHash = hashToken(token)

      const result = await logoutSession(token)

      expect(mockRevokeRefreshTokenByHash).toHaveBeenCalledWith({
        tokenHash: expectedHash,
        replacedByTokenHash: null,
      })
      expect(result).toBe(true)
    })

    it('returns false when revokeRefreshTokenByHash returns false', async () => {
      mockRevokeRefreshTokenByHash.mockResolvedValue(false)

      const result = await logoutSession('unknown-token')

      expect(result).toBe(false)
    })
  })
})
