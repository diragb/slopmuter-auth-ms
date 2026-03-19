// Packages:
import { vi } from 'vitest'
import request from 'supertest'
import type { Application } from 'express'
import {
  startTestDatabase,
  stopTestDatabase,
  cleanTables,
  getTestPool,
} from '../setup/test-db'
import { generateRefreshToken, hashToken } from '../../src/lib/crypto'

// Mocks:
const dbRef = vi.hoisted(() => ({ pool: null as any }))

vi.mock('../../src/config/db', () => ({
  get pool() {
    return dbRef.pool
  },
}))
vi.mock('../../src/config/redis', () => ({
  default: {
    connect: vi.fn(),
    quit: vi.fn(),
    disconnect: vi.fn(),
  },
}))
vi.mock('../../src/middleware/rate-limiter', () => ({
  globalLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  authLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}))

// Tests:
describe('auth logout routes', () => {
  let app: Application

  beforeAll(async () => {
    dbRef.pool = await startTestDatabase()
    const appModule = await import('../../src/app')
    app = appModule.default
  })

  afterAll(async () => {
    await stopTestDatabase()
  })

  beforeEach(async () => {
    await cleanTables()
  })

  it('POST /v1/auth/logout with valid token returns 204 and revokes token', async () => {
    const { findOrCreateUserByGoogleIdentity } = await import(
      '../../src/modules/users/user.repository'
    )
    const { createRefreshToken } = await import(
      '../../src/modules/tokens/refresh-token.repository'
    )

    const user = await findOrCreateUserByGoogleIdentity({
      email: 'logout@example.com',
      name: 'Logout User',
      avatarUrl: null,
      providerUserId: 'google-logout-1',
    })

    const refreshToken = generateRefreshToken()
    const refreshTokenHash = hashToken(refreshToken)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)
    await createRefreshToken({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
      userAgent: null,
      ipAddress: null,
    })

    const res = await request(app)
      .post('/v1/auth/logout')
      .send({ refreshToken })
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(204)

    const pool = getTestPool()
    expect(pool).not.toBeNull()
    const revoked = await pool!.query(
      'SELECT revoked_at FROM refresh_tokens WHERE token_hash = $1',
      [refreshTokenHash]
    )
    expect(revoked.rows[0]?.revoked_at).not.toBeNull()
  })

  it('POST /v1/auth/logout with already-revoked token still returns 204 (idempotent)', async () => {
    const res = await request(app)
      .post('/v1/auth/logout')
      .send({ refreshToken: 'unknown-or-revoked-token' })
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(204)
  })

  it('POST /v1/auth/logout with missing body returns 400', async () => {
    const res = await request(app)
      .post('/v1/auth/logout')
      .send({})
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(400)
    expect(res.body.error?.code).toBe('VALIDATION_ERROR')
  })
})
