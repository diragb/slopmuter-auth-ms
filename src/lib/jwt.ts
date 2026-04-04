// Packages:
import jwt from 'jsonwebtoken'

// Typescript:
interface AccessTokenPayload {
  sub: number
  email: string
  type: string
}

// Constants:
import { env } from '../config/env'

// Functions:
const signAccessToken = (payload: AccessTokenPayload) => {
  return jwt.sign(
    payload,
    env.jwtAccessSecret,
    env.jwtAccessExpiresIn
      ? {
          expiresIn: env.jwtAccessExpiresIn,
        }
      : undefined,
  )
}

// Exports:
export { signAccessToken }
