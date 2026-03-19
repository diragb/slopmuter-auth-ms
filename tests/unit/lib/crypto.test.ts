// Packages:
import { generateRefreshToken, hashToken } from '../../../src/lib/crypto'

// Tests:
describe('crypto', () => {
  describe('generateRefreshToken', () => {
    it('returns a 64-character hex string', () => {
      const token = generateRefreshToken()
      expect(token).toMatch(/^[a-f0-9]{64}$/)
      expect(token).toHaveLength(64)
    })

    it('produces unique values on successive calls', () => {
      const tokens = new Set<string>()
      for (let i = 0; i < 100; i++) {
        tokens.add(generateRefreshToken())
      }
      expect(tokens.size).toBe(100)
    })
  })

  describe('hashToken', () => {
    it('returns deterministic SHA-256 hex digest for same input', () => {
      const input = 'my-secret-token'
      const hash1 = hashToken(input)
      const hash2 = hashToken(input)
      expect(hash1).toBe(hash2)
      expect(hash1).toMatch(/^[a-f0-9]{64}$/)
    })

    it('returns different hashes for different inputs', () => {
      const hash1 = hashToken('token-a')
      const hash2 = hashToken('token-b')
      expect(hash1).not.toBe(hash2)
    })
  })
})
