// Packages:
import { z } from 'zod'

// Constants:
import env from '../../config/env'

// Functions:
const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
})

const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
})

const googleAuthSchema = z.object({
  code: z.string().min(1, 'code is required'),
  redirectUri: z
    .url('redirectUri must be a valid url')
    .refine(url => env.allowedCallbackUrls.includes(url), 'redirectUri is not in the allowed set'),
})

// Exports:
export { googleAuthSchema, refreshTokenSchema, logoutSchema }
