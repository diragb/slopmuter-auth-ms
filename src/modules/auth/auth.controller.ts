// Packages:
import { loginWithGoogle, logoutSession, refreshSession } from './auth.service'
import { AuthenticationError } from '../../lib/errors'

// Typescript:
import type { Request, Response } from 'express'

// Functions:
const googleAuth = async (req: Request, res: Response) => {
  const result = await loginWithGoogle({
    code: req.body.code,
    redirectUri: req.body.redirectUri,
    userAgent: req.get('user-agent') || null,
    ipAddress: req.ip || null,
  })

  return res.status(200).json(result)
}

const refreshAccessToken = async (req: Request, res: Response) => {
  const result = await refreshSession({
    refreshToken: req.body.refreshToken,
    userAgent: req.get('user-agent') || null,
    ipAddress: req.ip || null,
  })

  if (!result) throw new AuthenticationError('INVALID_REFRESH_TOKEN', 'Refresh token is invalid, expired, or revoked.')

  return res.status(200).json(result)
}

const logout = async (req: Request, res: Response) => {
  await logoutSession(req.body.refreshToken)

  return res.status(204).send()
}

// Exports:
export { googleAuth, refreshAccessToken, logout }
