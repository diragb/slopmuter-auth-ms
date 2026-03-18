// Packages:
import jwt from 'jsonwebtoken'

// Typescript:
interface AccessTokenPayload {
  sub: string
  email: string
  type: 'access'
}

// Constants:
import env from '../config/env'

// Functions:
const signAccessToken = (payload: AccessTokenPayload) => {
  return jwt.sign(payload, env.jwtAccessSecret, env.jwtAccessExpiresIn ? {
    expiresIn: env.jwtAccessExpiresIn,
  }: undefined)
}

// Exports:
export { signAccessToken }
