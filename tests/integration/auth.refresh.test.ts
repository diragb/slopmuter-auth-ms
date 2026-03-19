// Packages:
import { vi } from 'vitest'
import request from 'supertest'
import { startTestDatabase, stopTestDatabase, cleanTables, getTestPool } from '../setup/test-db'
import { generateRefreshToken, hashToken } from '../../src/lib/crypto'

// Typescript:
import type { Pool } from 'pg'
import type { Application } from 'express'

// Mocks:
const dbRef = vi.hoisted(() => ({ pool: null as Pool | null }))

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
  globalLimiter: (_req: unknown, _res: unknown, next: () => void) => {
    next()
  },
  authLimiter: (_req: unknown, _res: unknown, next: () => void) => {
    next()
  },
}))

// Tests:
describe('auth refresh routes', () => {
  let app: Application = null as unknown as Application

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

  it('POST /v1/auth/refresh with valid token returns 200 and new tokens', async () => {
    const { findOrCreateUserByGoogleIdentity } = await import('../../src/modules/users/user.repository')
    const { createRefreshToken } = await import('../../src/modules/tokens/refresh-token.repository')

    const user = await findOrCreateUserByGoogleIdentity({
      email: 'refresh@example.com',
      name: 'Refresh User',
      avatarUrl: null,
      providerUserId: 'google-refresh-1',
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
      .post('/v1/auth/refresh')
      .send({ refreshToken })
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeDefined()
    expect(res.body.refreshToken).toBeDefined()
    expect(res.body.expiresIn).toBe(900)
    expect(res.body.refreshToken).not.toBe(refreshToken)

    const pool = getTestPool()
    expect(pool).not.toBeNull()
    if (!pool) throw new Error('Test pool not ready')
    const revoked = await pool.query('SELECT revoked_at FROM refresh_tokens WHERE token_hash = $1', [refreshTokenHash])
    expect(revoked.rows[0]?.revoked_at).not.toBeNull()
  })

  it('POST /v1/auth/refresh with revoked token returns 401', async () => {
    const res = await request(app)
      .post('/v1/auth/refresh')
      .send({ refreshToken: 'revoked-or-invalid-token' })
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(401)
    expect(res.body.error?.code).toBe('INVALID_REFRESH_TOKEN')
  })

  it('POST /v1/auth/refresh with missing body returns 400', async () => {
    const res = await request(app).post('/v1/auth/refresh').send({}).set('Content-Type', 'application/json')

    expect(res.status).toBe(400)
    expect(res.body.error?.code).toBe('VALIDATION_ERROR')
  })
})
