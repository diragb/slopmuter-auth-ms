// Packages:
import { vi } from 'vitest'
import request from 'supertest'
import { startTestDatabase, stopTestDatabase } from '../setup/test-db'

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
describe('health routes', () => {
  let app: Application = null as unknown as Application

  beforeAll(async () => {
    dbRef.pool = await startTestDatabase()
    const appModule = await import('../../src/app')
    app = appModule.default
  })

  afterAll(async () => {
    await stopTestDatabase()
  })

  it('GET /v1/health returns 200 with status, service, and timestamp', async () => {
    const res = await request(app).get('/v1/health')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      status: 'ok',
      service: 'auth-service',
    })
    expect(res.body.timestamp).toBeDefined()
    expect(() => new Date(res.body.timestamp)).not.toThrow()
  })
})
