// Packages:
import jwt from 'jsonwebtoken'
import { signAccessToken } from '../../../src/lib/jwt'

// Tests:
describe('jwt', () => {
  describe('signAccessToken', () => {
    it('produces a JWT with expected claims', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        type: 'access' as const,
      }
      const token = signAccessToken(payload)
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })

    it('decodes to correct sub, email, and type claims', () => {
      const payload = {
        sub: 'user-456',
        email: 'alice@example.com',
        type: 'access' as const,
      }
      const token = signAccessToken(payload)
      const decoded = jwt.decode(token) as Record<string, unknown>
      expect(decoded['sub']).toBe('user-456')
      expect(decoded['email']).toBe('alice@example.com')
      expect(decoded['type']).toBe('access')
    })

    it('includes exp claim', () => {
      const payload = {
        sub: 'user-789',
        email: 'bob@example.com',
        type: 'access' as const,
      }
      const token = signAccessToken(payload)
      const decoded = jwt.decode(token) as Record<string, unknown>
      expect(decoded['exp']).toBeDefined()
      expect(typeof decoded['exp']).toBe('number')
      expect((decoded['exp'] as number)).toBeGreaterThan(Math.floor(Date.now() / 1000))
    })
  })
})
