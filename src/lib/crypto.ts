// Packages:
import crypto from 'crypto'

// Functions:
const generateRefreshToken = () => {
  return crypto.randomBytes(32).toString('hex')
}

const hashToken = (token: string) => {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// Exports:
export { generateRefreshToken, hashToken }
