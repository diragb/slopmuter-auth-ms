// Packages:
import { logoutSession, refreshSession } from './auth.service'

// Typescript:
import { Request, Response } from 'express'

// Functions:
const googleAuth = async (_req: Request, res: Response) => {
  return res.status(200).json({
    'accessToken': 'jwt',
    'refreshToken': 'opaque_random_token',
    'expiresIn': 900,
    'user': {
      'id': 123,
      'email': 'x@example.com',
      'name': 'dirag'
    }
  })
}

const refreshAccessToken = async (req: Request, res: Response) => {
  const result = await refreshSession({
    refreshToken: req.body.refreshToken,
    userAgent: req.get('user-agent') || null,
    ipAddress: req.ip || null,
  })

  if (!result) {
    return res.status(401).json({
      error: 'invalid_refresh_token',
      message: 'Refresh token is invalid, expired, or revoked.',
    })
  }

  return res.status(200).json(result)
}

const logout = async (req: Request, res: Response) => {
  await logoutSession(req.body.refreshToken)

  return res.status(204).send()
}

// Exports:
export { googleAuth, refreshAccessToken, logout }
