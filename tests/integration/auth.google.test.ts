// Packages:
import { vi } from 'vitest'
import request from 'supertest'
import {
  startTestDatabase,
  stopTestDatabase,
  cleanTables,
  getTestPool,
} from '../setup/test-db'

// Typescript:
import type { Application } from 'express'

// Constants:
const ALLOWED_REDIRECT_URI = 'http://localhost:3000/auth/google/callback'

// Mocks:
const dbRef = vi.hoisted(() => ({ pool: null as any }))
const mockExchangeCodeForGoogleIdentity = vi.fn()

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
vi.mock('../../src/modules/providers/google-oauth.provider', () => ({
  exchangeCodeForGoogleIdentity: (input: unknown) =>
    mockExchangeCodeForGoogleIdentity(input),
}))

// Tests:
describe('auth google routes', () => {
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
    mockExchangeCodeForGoogleIdentity.mockReset()
  })

  it('POST /v1/auth/google with valid code creates user and returns tokens', async () => {
    mockExchangeCodeForGoogleIdentity.mockResolvedValue({
      provider: 'google',
      providerUserId: 'google-123',
      email: 'google-user@example.com',
      emailVerified: true,
      name: 'Google User',
      avatarUrl: 'https://example.com/avatar.png',
    })

    const res = await request(app)
      .post('/v1/auth/google')
      .send({
        code: 'fake-auth-code',
        redirectUri: ALLOWED_REDIRECT_URI,
      })
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeDefined()
    expect(res.body.refreshToken).toBeDefined()
    expect(res.body.expiresIn).toBe(900)
    expect(res.body.user).toMatchObject({
      email: 'google-user@example.com',
      name: 'Google User',
      avatarUrl: 'https://example.com/avatar.png',
    })

    const pool = getTestPool()
    expect(pool).not.toBeNull()
    const users = await pool!.query(
      'SELECT id, email, name FROM users WHERE email = $1',
      ['google-user@example.com']
    )
    expect(users.rows).toHaveLength(1)
  })

  it('POST /v1/auth/google with same identity returns same user (find-or-create)', async () => {
    mockExchangeCodeForGoogleIdentity.mockResolvedValue({
      provider: 'google',
      providerUserId: 'google-same-1',
      email: 'same@example.com',
      emailVerified: true,
      name: 'Same User',
      avatarUrl: null,
    })

    const res1 = await request(app)
      .post('/v1/auth/google')
      .send({
        code: 'code-1',
        redirectUri: ALLOWED_REDIRECT_URI,
      })
      .set('Content-Type', 'application/json')

    const res2 = await request(app)
      .post('/v1/auth/google')
      .send({
        code: 'code-2',
        redirectUri: ALLOWED_REDIRECT_URI,
      })
      .set('Content-Type', 'application/json')

    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
    expect(res1.body.user.id).toBe(res2.body.user.id)

    const pool = getTestPool()
    expect(pool).not.toBeNull()
    const users = await pool!.query(
      'SELECT id FROM users WHERE provider_user_id = $1',
      ['google-same-1']
    )
    expect(users.rows).toHaveLength(1)
  })

  it('POST /v1/auth/google returns 401 when email is unverified', async () => {
    mockExchangeCodeForGoogleIdentity.mockResolvedValue({
      provider: 'google',
      providerUserId: 'google-unverified',
      email: 'unverified@example.com',
      emailVerified: false,
      name: 'Unverified',
      avatarUrl: null,
    })

    const res = await request(app)
      .post('/v1/auth/google')
      .send({
        code: 'fake-code',
        redirectUri: ALLOWED_REDIRECT_URI,
      })
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(401)
    expect(res.body.error?.code).toBe('GOOGLE_EMAIL_UNVERIFIED')
  })

  it('POST /v1/auth/google with missing body returns 400', async () => {
    const res = await request(app)
      .post('/v1/auth/google')
      .send({})
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(400)
    expect(res.body.error?.code).toBe('VALIDATION_ERROR')
  })
})
