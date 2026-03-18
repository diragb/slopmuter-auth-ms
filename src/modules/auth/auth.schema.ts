// Packages:
import { z } from 'zod'

// Functions:
const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
})

const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
})

const googleAuthSchema = z.object({
  code: z.string().min(1, 'code is required'),
  redirectUri: z.url('redirectUri must be a valid url'),
})

// Exports:
export { googleAuthSchema, refreshTokenSchema, logoutSchema }
